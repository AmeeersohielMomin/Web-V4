const http = require('http');

const payload = JSON.stringify({
  userPrompt: 'Build a tiny notes app with notes list create edit dashboard',
  provider: 'github',
  model: 'openai/gpt-4o-mini',
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/generate/v2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 240000,
  },
  (res) => {
    console.log('SSE_STATUS=' + res.statusCode);
    res.setEncoding('utf8');

    let buf = '';
    res.on('data', (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = block.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;

        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }

        if (evt.type === 'phase') {
          console.log('PHASE=' + (evt.phase || ''));
        }
        if (evt.type === 'validation_report') {
          console.log('VALIDATION_PASSED=' + evt.passed);
          console.log('VALIDATION_CRITICAL=' + JSON.stringify(evt.critical || []));
          console.log('VALIDATION_WARNINGS=' + JSON.stringify(evt.warnings || []));
        }
        if (evt.type === 'verification_report') {
          console.log('VERIFICATION_PASSED=' + evt.passed);
          console.log('VERIFICATION_CRITICAL=' + JSON.stringify(evt.criticalFailures || []));
          console.log('VERIFICATION_WARNINGS=' + JSON.stringify(evt.warnings || []));
          console.log('VERIFICATION_CHECKS=' + JSON.stringify(evt.checks || []));
        }
        if (evt.type === 'error') {
          console.log('ERROR=' + (evt.message || 'unknown'));
          if (evt.criticalFailures) {
            console.log('ERROR_CRITICAL=' + JSON.stringify(evt.criticalFailures));
          }
          req.destroy();
        }
        if (evt.type === 'complete') {
          console.log('COMPLETE=' + JSON.stringify({ fileCount: evt.fileCount, provider: evt.provider, model: evt.model }));
          req.destroy();
        }
      }
    });

    res.on('end', () => {
      console.log('STREAM_END=true');
    });

    res.on('error', (err) => {
      console.log('STREAM_ERROR=' + (err && err.message ? err.message : String(err)));
    });
  }
);

req.on('timeout', () => {
  console.log('CLIENT_TIMEOUT=true');
  req.destroy(new Error('client-timeout'));
});

req.on('error', (err) => {
  console.log('REQUEST_ERROR=' + (err && err.message ? err.message : String(err)));
});

req.write(payload);
req.end();
