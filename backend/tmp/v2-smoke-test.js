(async () => {
  const body = {
    userPrompt: 'Build a tiny notes app with notes list, create, edit and dashboard',
    provider: 'gemini'
  };

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 150000);

  let files = 0;
  let modules = 0;
  let sawPlan = false;
  let sawComplete = false;
  let sawError = false;
  let lastPhase = '';
  let errorMsg = '';

  try {
    const res = await fetch('http://localhost:5000/api/ai/generate/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    console.log('SSE_STATUS=' + res.status);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = chunk.split('\n').find((l) => l.startsWith('data: '));
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
          if (files % 20 === 0) console.log('FILES_EMITTED=' + files);
        }
        if (evt.type === 'complete') {
          sawComplete = true;
          console.log('COMPLETE_FILECOUNT=' + (evt.fileCount ?? 'n/a'));
          console.log('COMPLETE_PROVIDER=' + (evt.provider ?? 'n/a'));
          console.log('COMPLETE_MODEL=' + (evt.model ?? 'n/a'));
          reader.cancel();
          break;
        }
        if (evt.type === 'error') {
          sawError = true;
          errorMsg = evt.message || 'unknown';
          console.log('ERROR=' + errorMsg);
          reader.cancel();
          break;
        }
      }

      if (sawComplete || sawError) break;
    }
  } catch (e) {
    if (String(e?.name) === 'AbortError') {
      console.log('TIMEOUT_ABORT=true');
    } else {
      console.log('TEST_ERROR=' + (e?.message || String(e)));
    }
  } finally {
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
})();
