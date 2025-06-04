export async function get(url: string, config: RequestInit = {}): Promise<Response> {
  return fetch(url, { method: 'GET', ...config });
}

export async function post(url: string, data: any, config: RequestInit = {}): Promise<Response> {
  return fetch(url, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, ...config });
}

export async function put(url: string, data: any, config: RequestInit = {}): Promise<Response> {
  return fetch(url, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }, ...config });
}

export async function del(url: string, config: RequestInit = {}): Promise<Response> {
  return fetch(url, { method: 'DELETE', ...config });
}

export default { get, post, put, del };
