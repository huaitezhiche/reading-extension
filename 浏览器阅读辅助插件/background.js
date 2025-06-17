// 监听内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { 
    if (request.action === 'captureTab') { 
        // 后台脚本调用截图API
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (screenshotUrl) => { 
            sendResponse(screenshotUrl); 
        }); 
        return true; // 保持消息通道打开，等待异步响应
    } 
});