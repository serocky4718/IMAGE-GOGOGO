import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const apiModule = await import('../dist-electron/src/lib/api.js');
const generationModule = await import('../dist-electron/src/lib/image-generation.js');

function createConfig(endpoint, overrides = {}) {
  return {
    id: 'cfg-1',
    name: 'Mock API',
    endpoint,
    apiKey: 'test-key',
    model: 'gpt-image-1',
    protocol: 'openai-compatible-images',
    capabilities: {
      textToImage: 'supported',
      imageToImage: 'supported',
      aspectRatio: 'supported',
      resolution: 'supported',
      quality: 'supported',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createParams(overrides = {}) {
  return {
    mode: 'text-to-image',
    prompt: 'sunset over the lake',
    aspectRatio: '16:9',
    resolution: '1K',
    quality: 'high',
    apiConfigId: 'cfg-1',
    ...overrides,
  };
}

async function withServer(handler, run) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    let jsonBody;
    try {
      jsonBody = bodyText ? JSON.parse(bodyText) : undefined;
    } catch {
      jsonBody = bodyText;
    }
    requests.push({ method: req.method, url: req.url, headers: req.headers, body: jsonBody });
    await handler(req, res, jsonBody);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Mock server failed to bind to a local port.');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run({ baseUrl, requests });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('buildOpenAiCompatibleRequestBody emits stable payload for text-to-image', () => {
  const body = apiModule.buildOpenAiCompatibleRequestBody(
    createParams(),
    { model: 'gpt-image-1' },
    '1280x720',
  );

  assert.deepEqual(body, {
    model: 'gpt-image-1',
    prompt: 'sunset over the lake',
    size: '1280x720',
    quality: 'high',
    image: undefined,
    response_format: 'url',
  });
});

test('requestOpenAiCompatibleImage sends HTTP request and parses nested url payload', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ url: 'https://example.com/image.png' }] }));
    },
    async ({ baseUrl, requests }) => {
      const result = await generationModule.requestOpenAiCompatibleImage(
        createParams(),
        createConfig(`${baseUrl}/v1/images/generations`),
        {
          requestTimeoutMs: 200,
          requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
          normalizeSize: () => '1280x720',
        },
      );

      assert.equal(result.imageUrl, 'https://example.com/image.png');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, 'POST');
      assert.equal(requests[0].headers.authorization, 'Bearer test-key');
      assert.deepEqual(requests[0].body, {
        model: 'gpt-image-1',
        prompt: 'sunset over the lake',
        size: '1280x720',
        quality: 'high',
        response_format: 'url',
      });
    },
  );
});

test('requestOpenAiCompatibleImage parses nested base64 payload', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ b64_json: 'aGVsbG8=' }] }));
    },
    async ({ baseUrl }) => {
      const result = await generationModule.requestOpenAiCompatibleImage(
        createParams(),
        createConfig(`${baseUrl}/v1/images/generations`),
        {
          requestTimeoutMs: 200,
          requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
          normalizeSize: () => '1280x720',
        },
      );

      assert.equal(result.imageDataUrl, 'data:image/png;base64,aGVsbG8=');
    },
  );
});

test('requestOpenAiCompatibleImage surfaces API failure details', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'bad prompt' } }));
    },
    async ({ baseUrl }) => {
      await assert.rejects(
        generationModule.requestOpenAiCompatibleImage(
          createParams(),
          createConfig(`${baseUrl}/v1/images/generations`),
          {
            requestTimeoutMs: 200,
            requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
            normalizeSize: () => '1280x720',
          },
        ),
        /API 请求失败 \(400\).*bad prompt/,
      );
    },
  );
});

test('requestOpenAiCompatibleImage rejects payloads without image fields', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{}] }));
    },
    async ({ baseUrl }) => {
      await assert.rejects(
        generationModule.requestOpenAiCompatibleImage(
          createParams(),
          createConfig(`${baseUrl}/v1/images/generations`),
          {
            requestTimeoutMs: 200,
            requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
            normalizeSize: () => '1280x720',
          },
        ),
        /没有识别到图片 URL 或 base64 图片数据/,
      );
    },
  );
});

test('requestOpenAiCompatibleImage returns readable timeout message', async () => {
  await withServer(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    async ({ baseUrl }) => {
      await assert.rejects(
        generationModule.requestOpenAiCompatibleImage(
          createParams(),
          createConfig(`${baseUrl}/v1/images/generations`),
          {
            requestTimeoutMs: 20,
            requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
            normalizeSize: () => '1280x720',
          },
        ),
        /请求超时，请检查第三方 API 是否可用或稍后重试。/,
      );
    },
  );
});

test('fetchWithTimeout returns readable timeout message for image download path', async () => {
  await withServer(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    async ({ baseUrl }) => {
      await assert.rejects(
        generationModule.fetchWithTimeout(
          `${baseUrl}/slow-image.png`,
          { method: 'GET' },
          20,
          '下载生成图片超时，请稍后重试。',
        ),
        /下载生成图片超时，请稍后重试。/,
      );
    },
  );
});

test('requestOpenAiCompatibleImage still sends request when capability is marked unsupported', async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ url: 'https://example.com/image.png' }] }));
    },
    async ({ baseUrl, requests }) => {
      const result = await generationModule.requestOpenAiCompatibleImage(
        createParams(),
        createConfig(`${baseUrl}/v1/images/generations`, {
          capabilities: {
            textToImage: 'unsupported',
            imageToImage: 'supported',
            aspectRatio: 'supported',
            resolution: 'supported',
            quality: 'supported',
          },
        }),
        {
          requestTimeoutMs: 200,
          requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
          normalizeSize: () => '1280x720',
        },
      );

      assert.equal(result.imageUrl, 'https://example.com/image.png');
      assert.equal(requests.length, 1);
    },
  );
});
