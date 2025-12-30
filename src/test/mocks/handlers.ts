import { http, HttpResponse } from 'msw';

/**
 * MSW handlers for mocking API requests in tests
 * Add your API endpoint handlers here
 */
export const handlers = [
  // Example handler - replace with actual API endpoints
  http.get('/api/example', () => {
    return HttpResponse.json({
      message: 'Mocked response',
    });
  }),

  // Add more handlers here as needed for your API endpoints
  // http.post('/api/auth/login', async ({ request }) => {
  //   const body = await request.json();
  //   return HttpResponse.json({ token: 'mock-token' });
  // }),
];

