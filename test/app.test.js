const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(run) {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('health endpoint returns healthy status', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'healthy' });
  });
});

test('task lifecycle works', async () => {
  await withServer(async (baseUrl) => {
    const createResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Deploy to AKS' }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.completed, false);

    const updateResponse = await fetch(`${baseUrl}/api/tasks/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.completed, true);

    const listResponse = await fetch(`${baseUrl}/api/tasks`);
    const list = await listResponse.json();
    assert.equal(list.count, 1);

    const deleteResponse = await fetch(`${baseUrl}/api/tasks/${created.id}`, {
      method: 'DELETE',
    });
    assert.equal(deleteResponse.status, 204);
  });
});

test('metrics endpoint exposes Prometheus metrics', async () => {
  await withServer(async (baseUrl) => {
    await fetch(`${baseUrl}/healthz`);
    const response = await fetch(`${baseUrl}/metrics`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.match(body, /task_api_http_requests_total/);
    assert.match(body, /task_api_process_cpu_user_seconds_total/);
  });
});
