const SUPABASE_URL = 'https://yeoccpkjhpgtmfsrabxy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rlhJUBPorEKqKLUgClj30Q_7EhBXUEd';
const ALLOWED_TABLES = new Set(['products','videos','site_settings','offers','reviews','coupons']);

exports.handler = async function(event) {
  try {
    const table = String(event.queryStringParameters?.table || '');
    if (!ALLOWED_TABLES.has(table)) {
      return { statusCode: 400, headers: {'content-type':'application/json'}, body: JSON.stringify({error:'Invalid table'}) };
    }

    const incoming = event.queryStringParameters || {};
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(incoming)) {
      if (key !== 'table' && value != null) params.set(key, value);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        Accept: 'application/json'
      }
    });

    const body = await response.text();
    return {
      statusCode: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store'
      },
      body
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: {'content-type':'application/json'},
      body: JSON.stringify({error: error.message || 'Supabase proxy request failed'})
    };
  }
};
