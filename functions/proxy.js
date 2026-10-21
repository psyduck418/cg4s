export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response("未提供目標網址", { status: 400 });
  }

  try {
    const modifiedRequest = new Request(targetUrl, {
      headers: request.headers,
      method: request.method,
      body: request.body,
      redirect: 'follow'
    });

    const response = await fetch(modifiedRequest);
    
    // 建立新回應，完整保留二進位與串流資料（確保 WebGL、圖片與遊戲模組不損壞）
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    // 💡 關鍵：強制拔掉所有會導致崩潰或拒絕內嵌的安全防護
    newResponse.headers.delete('X-Frame-Options');
    newResponse.headers.delete('Content-Security-Policy');
    newResponse.headers.delete('X-Content-Type-Options');

    return newResponse;
  } catch (err) {
    return new Response("代理連線失敗: " + err.message, { status: 500 });
  }
}
