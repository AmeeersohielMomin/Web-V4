import fetch from 'node-fetch';

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

export interface RailwayDeployResult {
  projectId: string;
  serviceId: string;
  serviceUrl: string;
  deploymentId: string;
  status: 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CRASHED' | 'WAITING';
}

export class RailwayService {
  private async gql(token: string, query: string, variables?: object): Promise<any> {
    const response = await fetch(RAILWAY_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      throw new Error(`Railway GraphQL error: ${data.errors[0].message}`);
    }

    return data.data;
  }

  async deployBackend(
    railwayToken: string,
    projectName: string,
    repoOwner: string,
    repoName: string
  ): Promise<RailwayDeployResult> {
    const createProjectData = await this.gql(
      railwayToken,
      `
      mutation CreateProject($name: String!) {
        projectCreate(input: { name: $name }) {
          id
          name
        }
      }
      `,
      { name: projectName }
    );

    const projectId = String(createProjectData?.projectCreate?.id || '');
    if (!projectId) {
      throw new Error('Failed to create Railway project');
    }

    const createServiceData = await this.gql(
      railwayToken,
      `
      mutation CreateService($projectId: String!, $name: String!, $source: ServiceSourceInput) {
        serviceCreate(input: {
          projectId: $projectId
          name: $name
          source: $source
        }) {
          id
          name
        }
      }
      `,
      {
        projectId,
        name: `${projectName}-backend`,
        source: {
          repo: `${repoOwner}/${repoName}`
        }
      }
    );

    const serviceId = String(createServiceData?.serviceCreate?.id || '');
    if (!serviceId) {
      throw new Error('Failed to create Railway service');
    }

    await this.gql(
      railwayToken,
      `
      mutation SetVariables($projectId: String!, $serviceId: String!, $variables: EnvironmentVariablesInput!) {
        variableCollectionUpsert(
          projectId: $projectId
          serviceId: $serviceId
          variables: $variables
        )
      }
      `,
      {
        projectId,
        serviceId,
        variables: {
          PORT: '5000',
          NODE_ENV: 'production',
          RAILWAY_ROOT_DIR: 'backend'
        }
      }
    );

    const deployData = await this.gql(
      railwayToken,
      `
      mutation DeployService($serviceId: String!, $environmentId: String) {
        serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
      }
      `,
      { serviceId }
    );

    const domainData = await this.gql(
      railwayToken,
      `
      query GetServiceDomain($serviceId: String!) {
        service(id: $serviceId) {
          domains {
            serviceDomains {
              domain
            }
          }
        }
      }
      `,
      { serviceId }
    );

    const domains = domainData?.service?.domains?.serviceDomains || [];
    const serviceUrl =
      domains.length > 0
        ? `https://${domains[0].domain}`
        : `https://${serviceId}.railway.app`;

    return {
      projectId,
      serviceId,
      serviceUrl,
      deploymentId: String(deployData?.serviceInstanceDeploy || ''),
      status: 'BUILDING'
    };
  }

  async getDeploymentStatus(
    railwayToken: string,
    serviceId: string
  ): Promise<{ status: string; url?: string }> {
    const data = await this.gql(
      railwayToken,
      `
      query GetService($serviceId: String!) {
        service(id: $serviceId) {
          deployments(last: 1) {
            edges {
              node {
                status
                staticUrl
              }
            }
          }
        }
      }
      `,
      { serviceId }
    );

    const deployment = data?.service?.deployments?.edges?.[0]?.node;

    return {
      status: deployment?.status || 'BUILDING',
      url: deployment?.staticUrl || undefined
    };
  }

  async verifyToken(
    railwayToken: string
  ): Promise<{ valid: boolean; username?: string }> {
    try {
      const data = await this.gql(railwayToken, 'query { me { name email } }');
      return { valid: true, username: data?.me?.name || data?.me?.email };
    } catch {
      return { valid: false };
    }
  }
}

export const railwayService = new RailwayService();
