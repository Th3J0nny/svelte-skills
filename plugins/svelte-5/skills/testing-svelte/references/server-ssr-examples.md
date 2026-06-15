    	vi.mocked(database.createUser).mockResolvedValue({
    		id: '123',
    		email: 'user@example.com',
    	});

    	// Use real FormData
    	const formData = new FormData();
    	formData.append('email', 'user@example.com');
    	formData.append('password', 'securepass123');

    	// Use real Request object
    	const request = new Request('http://localhost/api/users', {
    		method: 'POST',
    		body: formData,
    	});

    	const response = await POST({ request });
    	const data = await response.json();

    	expect(response.status).toBe(201);
    	expect(data.email).toBe('user@example.com');
    	expect(database.createUser).toHaveBeenCalledWith({
    		email: 'user@example.com',
    		password: 'securepass123',
    	});
    });

    test('rejects invalid email format', async () => {
    	const formData = new FormData();
    	formData.append('email', 'invalid-email');
    	formData.append('password', 'pass123');

    	const request = new Request('http://localhost/api/users', {
    		method: 'POST',
    		body: formData,
    	});

    	const response = await POST({ request });
    	const data = await response.json();

    	expect(response.status).toBe(400);
    	expect(data.errors.email).toBeDefined();
    	expect(database.createUser).not.toHaveBeenCalled();
    });

    test('handles missing required fields', async () => {
    	const formData = new FormData();
    	// Missing email and password

    	const request = new Request('http://localhost/api/users', {
    		method: 'POST',
    		body: formData,
    	});

    	const response = await POST({ request });
    	const data = await response.json();

    	expect(response.status).toBe(400);
    	expect(data.errors.email).toBeDefined();
    	expect(data.errors.password).toBeDefined();
    });

});

````

### Example 4: SSR Test

Test server-side rendering output:

```typescript
// page.ssr.test.ts
import { test, expect, describe } from 'vitest';
import { render } from 'svelte/server';
import PageComponent from './+page.svelte';

describe('Page SSR', () => {
	test('renders without errors', () => {
		expect(() =>
			render(PageComponent, {
				props: { data: { title: 'Welcome' } },
			}),
		).not.toThrow();
	});

	test('renders correct HTML structure', async () => {
		const { body } = await render(PageComponent, {
			props: {
				data: {
					title: 'Welcome',
					items: ['Alpha', 'Beta', 'Gamma'],
				},
			},
		});

		expect(body).toContain('<h1>Welcome</h1>');
		expect(body).toContain('<li>Alpha</li>');
		expect(body).toContain('<li>Beta</li>');
		expect(body).toContain('<li>Gamma</li>');
	});

	test('applies correct CSS classes', async () => {
		const { body } = await render(PageComponent, {
			props: { data: { status: 'success' } },
		});

		// Test semantic CSS classes, not implementation details
		expect(body).toContain('text-success');
		expect(body).toContain('<svg'); // Icon present
	});

	test('handles empty data gracefully', async () => {
		const { body } = await render(PageComponent, {
			props: { data: { items: [] } },
		});

		expect(body).toContain('No items found');
	});
});
````

---
