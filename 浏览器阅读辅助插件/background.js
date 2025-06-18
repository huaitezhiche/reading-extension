// 监听内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { 
    // 原有全屏截图逻辑
    if (request.action === 'captureTab') { 
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (screenshotUrl) => { 
            sendResponse(screenshotUrl); 
        }); 
        return true; 
    } 
    
    // 新增区域截图逻辑（修复后）
    if (request.action === 'captureRegion') { 
        const { x, y, width, height } = request.region; 
        
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (screenshotUrl) => { 
            // 修复1: 检查chrome API错误
            if (chrome.runtime.lastError) {
                console.error('截图API调用失败:', chrome.runtime.lastError);
                sendResponse({ error: '截图被阻止: ' + chrome.runtime.lastError.message });
                return;
            }

            try {
                // 修复2: 验证截图URL有效性
                if (!screenshotUrl) {
                    throw new Error('无法获取截图URL');
                }

                const response = await fetch(screenshotUrl);
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                const blob = await response.blob();
                const imageBitmap = await createImageBitmap(blob);

                if (imageBitmap.width === 0 || imageBitmap.height === 0) {
                    throw new Error('无效的图像尺寸');
                }

                // 修复3: 确保裁剪区域在图像范围内
                const validX = Math.max(0, Math.min(x, imageBitmap.width));
                const validY = Math.max(0, Math.min(y, imageBitmap.height));
                const validWidth = Math.min(width, imageBitmap.width - validX);
                const validHeight = Math.min(height, imageBitmap.height - validY);

                if (validWidth <= 0 || validHeight <= 0) {
                    throw new Error('裁剪区域超出图像范围');
                }

                const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imageBitmap, 0, 0);
                
                const croppedCanvas = new OffscreenCanvas(validWidth, validHeight);
                const croppedCtx = croppedCanvas.getContext('2d');
                croppedCtx.drawImage(
                    canvas, validX, validY, validWidth, validHeight, 0, 0, validWidth, validHeight
                );
                
                // 替换URL.createObjectURL为FileReader读取Blob
                const croppedBlob = await croppedCanvas.convertToBlob({ type: 'image/png' });
                
                // 使用FileReader替代URL.createObjectURL（Service Worker兼容）
                const reader = new FileReader();
                reader.onload = function(event) {
                    // 将Base64数据URL发送给内容脚本
                    sendResponse(event.target.result);
                };
                reader.onerror = function() {
                    sendResponse({ error: '无法读取截图数据: ' + reader.error.message });
                };
                reader.readAsDataURL(croppedBlob);
            } catch (error) {
                console.error('截图处理失败:', error);
                sendResponse({ error: error.message });
            } 
        }); 
        return true; 
    } 
    
    // 新增下载处理逻辑
    if (request.action === 'downloadImage') {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            conflictAction: 'uniquify' // 自动处理文件名冲突
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });
        return true; // 表示将异步发送响应
    }
});