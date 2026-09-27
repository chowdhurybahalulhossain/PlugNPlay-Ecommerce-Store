const API_BASE = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const apiRequest = async (endpoint, method = 'GET', body = null, auth = false) => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        headers['Authorization'] = `Bearer ${getToken()}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
};