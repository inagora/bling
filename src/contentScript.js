// 接收background的信息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "COUNT") {
		console.log(`Current count is ${request.payload.count}`);
	}
	sendResponse({});
	return true;
});

// 接收页面信息
let isPageReady = false;
window.addEventListener(
	"message",
	(event) => {
		if (event.source !== window) {
			return;
		}

		switch (event.data.cmd) {
			case "updateDynamicRules": {
				chrome.runtime.sendMessage(event.data);
				break;
			}
			case "pageReady": {
				// 页面已经ok，告知它我们也ok了
				window.postMessage({ cmd: "blingReady" }, "*");
				isPageReady = true;
				break;
			}
		}
	},
	false
);

// 告知页面扩展ok了
window.postMessage({ cmd: "blingReady" }, "*");
