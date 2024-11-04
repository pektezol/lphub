// llm ahh funcs
export function get_user_id_from_token(token: string | undefined): string | undefined {
  if (!token) {
    return undefined;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
  return JSON.parse(jsonPayload).sub;
};

export function get_user_mod_from_token(token: string | undefined): boolean | undefined {
  if (!token) {
    return undefined;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
  return JSON.parse(jsonPayload).mod;
};
