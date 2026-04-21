test('User Journey', async () => {
    const response = await fetch('/api/user');
    const user = await response.json();
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');

    const loginResponse = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: 'password' }),
        headers: { 'Content-Type': 'application/json' }
    });
    expect(loginResponse.status).toBe(200);

    const dashboardResponse = await fetch('/dashboard');
    expect(dashboardResponse.status).toBe(200);
});