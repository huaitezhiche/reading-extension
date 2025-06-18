// 阅读状态计算与显示
function initReadingStatus() {
    // 创建状态栏容器
    const statusBar = document.createElement('div');
    statusBar.id = 'reading-status-bar';
    statusBar.style.cssText = 'position: fixed; bottom: 20px; left: 20px; padding: 8px 15px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px; z-index: 99999; display: flex; align-items: center; gap: 10px;';

    // 添加状态文本容器（关键修改：用span包裹文本，避免覆盖按钮）
    const statusText = document.createElement('span');
    statusText.id = 'status-text';
    statusBar.appendChild(statusText);

    // 新增：时间统计变量
    let elapsedTotal = 0; // 累计已读时间（毫秒）
    let startTime = Date.now(); // 本次激活的开始时间
    let isActive = true; // 标签页是否处于活动状态

    // 更新状态的函数（修改核心逻辑）
    function updateStatus() {
        const scrollY = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? (scrollY / totalHeight * 100).toFixed(1) : 0;
        
        // 仅在标签页活动时计算当前段时间
        const currentElapsed = isActive ? (Date.now() - startTime) : 0;
        const totalElapsedMs = elapsedTotal + currentElapsed;
        const totalElapsedSec = Math.floor(totalElapsedMs / 1000);
        const minutes = Math.floor(totalElapsedSec / 60);
        const seconds = totalElapsedSec % 60;
        
        statusText.textContent = `进度：${progress}% | 已读：${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // 新增：标签页可见性监听
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // 标签页隐藏时：暂停计时，记录累计时间
            isActive = false;
            elapsedTotal += Date.now() - startTime;
        } else {
            // 标签页显示时：恢复计时，重置startTime
            isActive = true;
            startTime = Date.now();
            updateStatus(); // 立即更新状态避免延迟
        }
    });

    // 初始更新（原有代码不变）
    updateStatus();
    window.addEventListener('scroll', () => {
        requestAnimationFrame(updateStatus);
    });
    document.body.appendChild(statusBar);
}

// 笔记编辑器初始化（修改后）
function initNoteEditor() {
    const statusBar = document.getElementById('reading-status-bar');
    
    // 原有：添加笔记按钮
    const addNoteBtn = document.createElement('button');
    addNoteBtn.textContent = '添加笔记';
    addNoteBtn.style.cssText = 'margin-left: 15px; padding: 2px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;';
    statusBar.appendChild(addNoteBtn);
    
    // 新增：区域截图按钮
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '区域截图';
    captureBtn.style.cssText = 'margin-left: 8px; padding: 2px 8px; background: #ff9800; color: white; border: none; border-radius: 3px; cursor: pointer;';
    statusBar.appendChild(captureBtn);

    // 添加笔记按钮点击事件（原有代码不变）
    addNoteBtn.onclick = () => {
        const editor = document.createElement('div');
        editor.id = 'note-editor';
        editor.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 15px; background: white; border: 1px solid #ddd; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 99999;';

        // 文本输入框（用于输入笔记内容）
        const textarea = document.createElement('textarea');
        textarea.placeholder = '输入钉图备注...';
        textarea.style.cssText = 'width: 300px; height: 100px; margin-bottom: 10px;';

        // 钉图按钮（替代原截图/下载/保存）
        const pinBtn = document.createElement('button');
        pinBtn.textContent = '钉在网页';
        pinBtn.style.cssText = 'padding: 5px 10px; background: #4CAF50; color: white; border: none;';
        // 钉图按钮点击事件（修改后）
        pinBtn.onclick = async () => { 
            try { 
                // 1. 捕获当前页面截图（通过后台脚本）
                const screenshotUrl = await new Promise(resolve => {
                    chrome.runtime.sendMessage({ action: 'captureTab' }, resolve);
                });

                // 2. 创建钉图元素
                const pinElement = document.createElement('div');
                pinElement.className = 'pinned-note';
                pinElement.style.cssText = ` 
                    position: fixed; 
                    top: 20%; 
                    left: 20%; 
                    max-width: 300px; 
                    background: rgba(255, 255, 255, 0.95); 
                    border: 1px solid #ddd; 
                    border-radius: 4px; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                    padding: 10px; 
                    z-index: 99998; 
                `;

                // 3. 组合截图和笔记内容

                const noteText = document.createElement('p');
                noteText.textContent = textarea.value;
                noteText.style.cssText = 'margin: 0; font-size: 14px; color: #333;';

                // 4. 添加关闭按钮（修改后）
                const closeBtn = document.createElement('button'); 
                closeBtn.textContent = '×'; 
                closeBtn.style.cssText = ` 
                    position: absolute; 
                    top: -10px; /* 调整到元素顶部外侧 */ 
                    right: -10px; /* 调整到元素右侧外侧 */ 
                    padding: 0 6px; 
                    background: #f44336; 
                    color: white; 
                    border: 2px solid white; /* 添加白色边框增强对比 */ 
                    border-radius: 50%; 
                    cursor: pointer; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2); /* 添加阴影提升可见性 */ 
                `; 
                closeBtn.onclick = () => pinElement.remove(); 

                // 5. 添加拖动功能（新增代码）
                let isDragging = false; 
                let offsetX = 0; 
                let offsetY = 0; 

                // 鼠标按下时初始化拖动
                pinElement.addEventListener('mousedown', (e) => { 
                    isDragging = true; 
                    offsetX = e.clientX - pinElement.offsetLeft; 
                    offsetY = e.clientY - pinElement.offsetTop; 
                    pinElement.style.cursor = 'grabbing'; // 拖动时指针样式
                }); 

                // 鼠标移动时更新位置
                document.addEventListener('mousemove', (e) => { 
                    if (!isDragging) return; 
                    const newX = e.clientX - offsetX; 
                    const newY = e.clientY - offsetY; 
                    pinElement.style.left = `${newX}px`; 
                    pinElement.style.top = `${newY}px`; 
                }); 

                // 鼠标松开时结束拖动
                document.addEventListener('mouseup', () => { 
                    isDragging = false; 
                    pinElement.style.cursor = 'grab'; // 拖动结束指针样式
                }); 

                // 6. 组装钉图元素并添加到页面（原有代码）
                pinElement.append(closeBtn, noteText); 
                document.body.appendChild(pinElement); 

                // 6. 关闭编辑器
                editor.remove();
            } catch (error) {
                alert('钉图失败：' + error.message);
            }
        }; 

        // 取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = 'padding: 5px 10px; background: #f44336; color: white; border: none; margin-left: 8px;';
        cancelBtn.onclick = () => editor.remove();

        // 组装编辑器（仅保留钉图和取消按钮）
        editor.append(textarea, pinBtn, cancelBtn);
        document.body.appendChild(editor);
    };

    // 新增：区域截图按钮点击事件（修改后）
    captureBtn.onclick = () => {
        // 创建全屏蒙版（原有代码不变）
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 999999;
            cursor: crosshair;
        `;
        document.body.appendChild(overlay);
    
        // 创建选择框（原有代码不变）
        const selectionFrame = document.createElement('div');
        selectionFrame.style.cssText = `
            position: absolute; border: 2px solid #4CAF50;
            background: rgba(76, 175, 80, 0.2);
        `;
        document.body.appendChild(selectionFrame);
    
        // 截图选择变量（原有代码不变）
        let isSelecting = false;
        let startX, startY;
    
        // 鼠标事件处理（原有代码不变）
        overlay.addEventListener('mousedown', (e) => {
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;
            selectionFrame.style.left = `${startX}px`;
            selectionFrame.style.top = `${startY}px`;
            selectionFrame.style.width = '0';
            selectionFrame.style.height = '0';
            selectionFrame.style.display = 'block';
        });
    
        // 鼠标移动更新选择框
        overlay.addEventListener('mousemove', (e) => {
            if (!isSelecting) return;
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            selectionFrame.style.width = `${Math.abs(width)}px`;
            selectionFrame.style.height = `${Math.abs(height)}px`;
            selectionFrame.style.left = `${width < 0 ? e.clientX : startX}px`;
            selectionFrame.style.top = `${height < 0 ? e.clientY : startY}px`;
        });
    
        // 鼠标释放完成选择（修改后）
        overlay.addEventListener('mouseup', async (e) => {
            if (!isSelecting) return;
            isSelecting = false;
    
            // 计算选择区域（考虑页面滚动和选择框边框）
            const borderWidth = 2; // 选择框边框宽度
            const x = Math.min(startX, e.clientX) + window.scrollX + borderWidth;
            const y = Math.min(startY, e.clientY) + window.scrollY + borderWidth;
            const width = Math.abs(e.clientX - startX) - borderWidth * 2;
            const height = Math.abs(e.clientY - startY) - borderWidth * 2;
    
            // 先隐藏选择框再截图
            selectionFrame.style.display = 'none';
            overlay.style.display = 'none';
    
            // 发送区域截图请求
            if (width > 0 && height > 0) {
                try {
                    // 使用requestAnimationFrame确保DOM更新完成
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    const result = await new Promise(resolve => {
                        chrome.runtime.sendMessage({
                            action: 'captureRegion',
                            region: { x, y, width, height }
                        }, resolve);
                    });
    
                    // 下载截图
                    // 替换直接调用chrome.downloads.download的代码
                    if (result && !result.error) {
                        // 发送下载请求到background.js
                        chrome.runtime.sendMessage({
                            action: 'downloadImage',
                            url: result,
                            filename: `阅读笔记/截图/区域截图-${new Date().getTime()}.png`
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                alert('下载请求失败: ' + chrome.runtime.lastError.message);
                            } else if (response && response.error) {
                                alert('下载失败: ' + response.error);
                            }
                        });
                    } else {
                        // 错误处理代码保持不变
                        if (result && result.error) {
                            if (result.error.includes('被阻止')) {
                                alert('截图失败: ' + result.error + '\n\n可能是广告拦截器或浏览器安全设置阻止了截图，请尝试暂时禁用相关扩展或添加例外。');
                            } else {
                                alert('截图失败: ' + result.error);
                            }
                        }
                    }
                } catch (error) {
                    alert('截图处理失败: ' + error.message);
                }
            }
        });
    };
}

// 初始化所有功能
window.addEventListener('load', () => {
    initReadingStatus();
    initNoteEditor();
});