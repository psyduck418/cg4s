export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response("未提供目標網址", { status: 400 });
  }

  try {
    const targetObj = new URL(targetUrl);
    
    const modifiedRequest = new Request(targetUrl, {
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': targetObj.host,
        'Referer': targetObj.origin + '/'
      },
      method: request.method,
      body: request.body,
      redirect: 'follow'
    });

    const response = await fetch(modifiedRequest);
    const contentType = response.headers.get('content-type') || '';

    // 如果是 HTML 網頁，我們把內容抓下來，嘗試修正內部的相對路徑
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // 將原本網頁內的相對路徑（/xxx）導向透過我們的代理重新請求
      // 這樣可以大幅減少 CrazyGames 這種大型網站破圖的機率
      const baseOrigin = targetObj.origin;
      
      // 簡單注入 base 標籤讓瀏覽器自動補全相對路徑
      html = html.replace('<head>', `<head><base href="${baseOrigin}/">`);

      const newResponse = new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      newResponse.headers.delete('X-Frame-Options');
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('X-Content-Type-Options');
      return newResponse;
    }

    // 非 HTML 檔案（如圖片、JS、CSS、遊戲二進位檔）直接原封不動安全轉發
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    newResponse.headers.delete('X-Frame-Options');
    newResponse.headers.delete('Content-Security-Policy');
    newResponse.headers.delete('X-Content-Type-Options');

    return newResponse;
  } catch (err) {
    return new Response("代理載入失敗: " + err.message, { status: 500 });
  }
}
