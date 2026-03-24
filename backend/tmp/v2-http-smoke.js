const http = require('http');

const payload = JSON.stringify({
  userPrompt: 'Build a tiny notes app with notes list create edit dashboard',
  provider: 'gemini',
});

let sawPlan = false;
let sawComplete = false;
let sawError = false;
let modules = 0;
let files = 0;
let lastPhase = '';
let errorMsg = '';

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
    timeout: 180000,
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
        try {
          evt = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        if (evt.type === 'phase') {
          lastPhase = evt.phase || '';
          console.log('PHASE=' + lastPhase);
        }
        if (evt.type === 'phase_diagnostic') {
          console.log(
            'DIAG phase=' + (evt.phase || '') +
            ' status=' + (evt.status || '') +
            ' attempt=' + (evt.attempt ?? '') +
            ' provider=' + (evt.provider || '') +
            ' model=' + (evt.model || '')
          );
        }
        if (evt.type === 'plan') {
          sawPlan = true;
          console.log('PLAN_MODULES=' + (evt.moduleCount ?? 'n/a'));
        }
        if (evt.type === 'module_complete') {
          modules += 1;
          console.log('MODULE_OK=' + (evt.module || '') + ' files=' + (evt.fileCount ?? 'n/a'));
        }
        if (evt.type === 'file') {
          files += 1;
        }
        if (evt.type === 'complete') {
          sawComplete = true;
          console.log('COMPLETE_FILECOUNT=' + (evt.fileCount ?? 'n/a'));
          req.destroy();
        }
        if (evt.type === 'error') {
          sawError = true;
          errorMsg = evt.message || 'unknown';
          console.log('ERROR=' + errorMsg);
          req.destroy();
        }
      }
    });

    res.on('end', () => {
      console.log('STREAM_END=true');
      printSummary();
    });

    res.on('error', (err) => {
      console.log('STREAM_ERROR=' + (err && err.message ? err.message : String(err)));
      printSummary();
    });
  }
);

function printSummary() {
  console.log(
    'SUMMARY plan=' + sawPlan +
      ' modules=' + modules +
      ' files=' + files +
      ' complete=' + sawComplete +
      ' error=' + sawError +
      ' lastPhase=' + lastPhase +
      ' errorMsg=' + errorMsg
  );
}

req.on('timeout', () => {
  console.log('CLIENT_TIMEOUT=true');
  req.destroy(new Error('client-timeout'));
});

req.on('error', (err) => {
  console.log('REQUEST_ERROR=' + (err && err.message ? err.message : String(err)));
  printSummary();
});

req.write(payload);
req.end();
