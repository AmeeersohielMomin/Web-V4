const http = require('http');

const payload = JSON.stringify({
  userPrompt: 'Build a tiny notes app with notes list create edit dashboard',
  provider: 'openai',
  model: 'gpt-4o-mini',
});

const port = Number(process.env.SMOKE_PORT || 5000);

const req = http.request(
  {
    hostname: 'localhost',
    port,
    path: '/api/ai/generate/v2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 600000,
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
          console.log('PHASE=' + String(evt.phase || ''));
        }
        if (evt.type === 'validation_report') {
          const attempt = String(evt.attempt || 'initial');
          console.log('VALIDATION attempt=' + attempt + ' warnings=' + ((evt.warnings || []).length));
        }
        if (evt.type === 'verification_report') {
          const attempt = String(evt.attempt || 'initial');
          console.log('VERIFICATION attempt=' + attempt + ' warnings=' + ((evt.warnings || []).length));
        }
        if (evt.type === 'error') {
          console.log('ERROR=' + String(evt.message || 'unknown'));
          req.destroy();
        }
        if (evt.type === 'complete') {
          console.log('COMPLETE fileCount=' + evt.fileCount + ' provider=' + evt.provider + ' model=' + evt.model);
          req.destroy();
        }
      }
    });

    res.on('end', () => {
      console.log('STREAM_END=true');
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
