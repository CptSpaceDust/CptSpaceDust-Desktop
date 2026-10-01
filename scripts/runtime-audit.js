const http = require("node:http");

http.get("http://127.0.0.1:9333/json/list", response => {
  let body = "";
  response.on("data", chunk => { body += chunk; });
  response.on("end", () => {
    const target = JSON.parse(body).find(item => item.url.includes("app.cptspacedust.local"));
    if (!target) throw new Error("Desktop renderer target was not found.");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const errors = [];
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
      socket.send(JSON.stringify({ id: 2, method: "Log.enable" }));
      setTimeout(() => socket.send(JSON.stringify({ id: 3, method: "Runtime.evaluate", params: {
        expression: "JSON.stringify({title:document.title,text:document.body.innerText.slice(0,500),frames:document.querySelectorAll('iframe').length})",
        returnByValue: true
      } })), 1500);
    });
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
      if (message.id === 3) {
        console.log(JSON.stringify({ page: JSON.parse(message.result.result.value), errors }, null, 2));
        socket.close();
      }
    });
  });
});
