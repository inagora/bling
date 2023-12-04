/**
 * 接收background的信息
 */
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
// 	if (request.type === "COUNT") {
// 		console.log(`Current count is ${request.payload.count}`);
// 	}
// 	sendResponse({});
// 	return true;
// });

/**
 * 接收主页面信息
 */
if (!window.location.href.startsWith("https://lens.52ritao.cn/")) {
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
	// 告知主页面扩展ok了
	window.postMessage({ cmd: "blingReady" }, "*");
}

const injectScript = {
	/**
	 * 
	 	const config = {
			hidden: [
				'wiz[1]@text',
				a[aria-label=更多图片]
			],
			labelBox: 'wiz[2]@parent',
			goods: 'a>div[data-thumbnail-url][data-item-title]'
		}
	 */
	queryAll(pathes) {
		let ret = [window.document];
		for (let conf of pathes) {
			if (typeof conf == "string") conf = { type: conf };
			let nodes = [];
			switch (conf.type) {
				case "selector":
					ret.forEach((node) => {
						let list = node.querySelectorAll(conf.selector);
						if (typeof conf.index != "undefined" && list.length > conf.index) {
							list = [list[conf.index]];
						}
						nodes = [...nodes, ...list];
					});
					break;
				case "textnode": {
					ret.forEach((node) => {
						const treeWalker = document.createTreeWalker(
							node,
							NodeFilter.SHOW_TEXT
						);

						while (treeWalker.nextNode()) {
							const n = treeWalker.currentNode;
							if (typeof conf.includes != "undefined") {
								if (n.data.includes(conf.includes)) {
									nodes.push(n);
								}
							} else {
								nodes.push(n);
							}
						}
					});
					break;
				}
				case "parent":
					nodes = ret.map((n) => n.parentNode);
					break;
				case "firstChild":
					nodes = ret.map((n) => n.firstChild);
					break;
			}
			ret = nodes;
		}

		return ret.filter((n) => n != window.document);
	},
	init(config) {
		for (const selector of config.hidden) {
			const nodes = this.queryAll(selector);
			nodes.forEach((n) => (n.hidden = true));
		}
		const labelBox = this.queryAll(config.labelBox)[0];
		this.labelBox = labelBox;
		const goodsBox = this.queryAll(config.goodsBox)[0];
		labelBox.addEventListener(
			"click",
			(e) => {
				let target = e.target;
				if (
					target.classList.contains("s-selected") ||
					target.classList.contains("s-no-select")
				) {
					target = target.parentNode;
				}
				const clsList = target.classList;
				if (!clsList.contains("s-label")) return;
				clsList.contains("s-active")
					? clsList.remove("s-active")
					: clsList.add("s-active");
			},
			false
		);

		const observer = new MutationObserver(() => this.addLabels(config));
		observer.observe(goodsBox, { childList: true, subtree: true });

		this.addLabels(config);
	},
	addLabels(config) {
		const win = window;
		const doc = win.document;
		this.labelBox.querySelectorAll(".s-label").forEach((item) => item.remove());
		const goodsList = this.queryAll(config.goods);
		if (goodsList.length <= 0) return;
		const boxRect = this.labelBox.getBoundingClientRect();
		const left = boxRect.left;
		const top = boxRect.top;

		goodsList.forEach((item) => {
			const rect = item.getBoundingClientRect();
			const label = doc.createElement("div");
			label.innerHTML = `<div class="s-label" style="left: ${
				rect.left - left
			}px;top:${rect.top - top}px;width:${rect.width}px;height:${
				rect.height
			}px">
					<a class="s-link" href="${item.dataset.actionUrl}" target="_blank">🔗</a>
					<span class="s-selected">✅</span>
				</div>
			`;
			label.firstChild.dataset.name = item.dataset.itemTitle;
			this.labelBox.appendChild(label.firstChild);
		});
	},
	getSelectedNames() {
		const list = Array.from(this.labelBox.querySelectorAll(".s-active")).map(
			(item) => item.dataset.name
		);

		window.parent.postMessage(
			{
				cmd: "collectedNames",
				list,
			},
			"*"
		);
	},
};
/**
 * 处理lens页面信息
 */
if (window.location.href.startsWith("https://lens.52ritao.cn/")) {
	const onReady = function (callback) {
		// don't use "interactive" on IE <= 10 (it can fired premature)
		if (
			window.document.readyState === "complete" ||
			(window.document.readyState !== "loading" &&
				!window.document.documentElement.doScroll)
		)
			setTimeout(function () {
				callback();
			}, 0);
		else {
			var handler = function () {
				window.document.removeEventListener("DOMContentLoaded", handler, false);
				window.removeEventListener("load", handler, false);
				callback();
			};
			window.document.addEventListener("DOMContentLoaded", handler, false);
			window.addEventListener("load", handler, false);
		}
	};
	onReady(() => {
		window.addEventListener(
			"message",
			(e) => {
				switch (e.data.cmd) {
					case "execute": {
						const doc = window.document;
						const style = doc.createElement("style");
						style.innerHTML = e.data.css || "";
						doc.head.appendChild(style);

						injectScript.init(e.data.config);
						break;
					}
					case "getSelectedNames": {
						injectScript.getSelectedNames();
						break;
					}
				}
			},
			false
		);
		window.parent.postMessage({ cmd: "lensReady" }, "*");
		if (window.trustedTypes && window.trustedTypes.createPolicy) {
			window.trustedTypes.createPolicy("default", {
				createHTML: (string, sink) => string,
			});
		}
	});
}
