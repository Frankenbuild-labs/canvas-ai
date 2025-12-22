/* Simple smoke tests for CRM APIs. Run with: node scripts/smoke-crm.js */
(async () => {
  process.env.NO_PROXY = process.env.NO_PROXY || '*';
  const base = process.env.BASE_URL || 'http://localhost:3010';
  const log = (...args) => console.log('[smoke]', ...args);

  async function postJSON(path, body) {
    const url = base + path;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  }

  const leads = [
    { id: '1', name: 'A', email: 'a@example.com', phone: '', company: 'X', position: '', status: 'qualified', value: 100000, source: 'Website', notes: 'Interested in enterprise.' , createdAt: '2024-01-01', lastContact: '2024-01-02' },
    { id: '2', name: 'B', email: 'b@example.com', phone: '', company: 'Y', position: '', status: 'proposal', value: 50000, source: 'Referral', notes: 'Sent proposal.' , createdAt: '2024-01-03', lastContact: '2024-01-04' },
    { id: '3', name: 'C', email: 'c@example.com', phone: '', company: 'Z', position: '', status: 'new', value: 15000, source: 'LinkedIn', notes: 'Schedule demo call.' , createdAt: '2024-01-05', lastContact: '2024-01-06' },
  ];
  const statuses = ['new','contacted','qualified','proposal','negotiation','won','lost','appointment'];

  const results = [];

  // 0) Preflight root GET
  try {
    const res = await fetch(base + '/', { method: 'GET' });
    log('preflight / status', res.status);
  } catch (e) {
    log('preflight error', e?.message || String(e), e?.cause || '');
  }

  // 1) Tool: stats.evaluate
  try {
    const r1 = await postJSON('/api/agents/crm', { tool: 'stats.evaluate', input: {}, leads });
    const pass = r1.ok && r1.data && r1.data.ok && r1.data.result && typeof r1.data.result.total === 'number';
    results.push({ name: 'stats.evaluate', pass, detail: r1 });
    log('stats.evaluate', pass ? 'PASS' : 'FAIL', r1);
  } catch (e) {
    results.push({ name: 'stats.evaluate', pass: false, error: String(e), stack: e?.stack, cause: e?.cause });
  }

  // 2) Tool: leads.bulkUpdate
  try {
    const r2 = await postJSON('/api/agents/crm', { tool: 'leads.bulkUpdate', input: { ids: ['1','2'], patch: { status: 'qualified' } }, leads });
    const pass = r2.ok && r2.data && r2.data.ok && r2.data.result && r2.data.result.updated === 2;
    results.push({ name: 'leads.bulkUpdate', pass, detail: r2 });
    log('leads.bulkUpdate', pass ? 'PASS' : 'FAIL', r2);
  } catch (e) {
    results.push({ name: 'leads.bulkUpdate', pass: false, error: String(e), stack: e?.stack, cause: e?.cause });
  }

  // 3) Chat: how many leads total
  try {
    const context = { filter: 'all', searchQuery: '', selectedIds: [], leads, statuses, defaultStatuses: statuses };
    const r3 = await postJSON('/api/agents/crm/chat', { message: 'how many leads total do we have?', context });
    // We accept either { ok:true, message: string } or an error if no API key
    const pass = r3.ok && r3.data && r3.data.ok && typeof r3.data.message === 'string';
    results.push({ name: 'chat.howManyTotal', pass, detail: r3 });
    log('chat.howManyTotal', pass ? 'PASS' : 'WARN', r3);
  } catch (e) {
    results.push({ name: 'chat.howManyTotal', pass: false, error: String(e), stack: e?.stack, cause: e?.cause });
  }

  const summary = {
    passed: results.filter(r => r.pass).length,
    total: results.length,
    failures: results.filter(r => !r.pass).map(r => ({ name: r.name, detail: r.detail || r.error }))
  };
  console.log('\n[smoke] Summary:', JSON.stringify(summary, null, 2));

  if (summary.failures.length) process.exitCode = 1;
})();
