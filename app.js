/**
 * 会议室预订系统 - 修复版本
 * 修复内容：
 * 1. XSS安全漏洞
 * 2. 初始化时机问题
 * 3. 添加表单验证
 * 4. 改进错误处理
 * 5. 编辑表单样式
 */

let supabaseClient;

// 初始化 Supabase
function initSupabase() {
    const SUPABASE_URL = 'https://lvidoxkbwaeaaiubggyz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_lFYEaCgur3SihqL3XHH4jw_i2BhaFvg';

    // ⚠️ 安全警告：此密钥暴露在前端，存在安全风险
    // 建议：使用 Supabase RLS 策略限制权限，或搭建后端服务
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase CDN 加载失败，请检查网络连接');
        showError('系统加载失败，请刷新页面重试');
        return null;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return supabaseClient;
}

const periods = ['上午', '下午'];
const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
let currentWeekOffset = 0;
let currentWeekDates = [];
let selectedDateIndex = 0;
let allBookings = [];

// 初始化 - 修复：使用 DOMContentLoaded 确保DOM加载完成
document.addEventListener('DOMContentLoaded', async () => {
    const client = initSupabase();
    if (!client) return;

    await loadBookings();
    setupWeekNavigation();
    setupModalClose();
});

// 设置弹窗关闭事件
function setupModalClose() {
    const modal = document.getElementById('modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// 显示错误提示
function showError(message) {
    const container = document.getElementById('timeSlots');
    container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
}

// HTML转义 - 修复XSS漏洞
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// 将日期格式化为 YYYY-MM-DD（使用本地时间）
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取本周日期范围
function getWeekRange(offset = 0) {
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7));
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + daysToMonday);

    currentWeekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        currentWeekDates.push({
            date: formatLocalDate(date),
            day: dayNames[(i + 1) % 7],
            month: date.getMonth() + 1,
            dayNum: date.getDate()
        });
    }

    const today = formatLocalDate(new Date());
    selectedDateIndex = currentWeekDates.findIndex(d => d.date === today);
    if (selectedDateIndex === -1) selectedDateIndex = 0;

    return { start: currentWeekDates[0].date, end: currentWeekDates[6].date };
}

// 更新周标题
function updateWeekTitle() {
    const title = document.getElementById('weekTitle');
    if (currentWeekOffset === 0) {
        title.textContent = '本周';
    } else if (currentWeekOffset > 0) {
        title.textContent = `${currentWeekOffset}周后`;
    } else {
        title.textContent = `${Math.abs(currentWeekOffset)}周前`;
    }
}

// 设置周导航
function setupWeekNavigation() {
    document.getElementById('prevWeek').addEventListener('click', async () => {
        currentWeekOffset--;
        await loadBookings();
    });

    document.getElementById('nextWeek').addEventListener('click', async () => {
        currentWeekOffset++;
        await loadBookings();
    });
}

// 加载预订数据
async function loadBookings() {
    try {
        const weekRange = getWeekRange(currentWeekOffset);
        updateWeekTitle();

        const { data, error } = await supabaseClient
            .from('booking')
            .select('*')
            .gte('date', weekRange.start)
            .lte('date', weekRange.end)
            .order('date', { ascending: true });

        if (error) throw error;

        allBookings = data || [];
        renderDateTabs();
        renderTimeSlots();
    } catch (error) {
        console.error('加载数据失败:', error);
        showError('加载数据失败，请检查网络连接后刷新页面');
    }
}

// 渲染日期标签页
function renderDateTabs() {
    const container = document.getElementById('dateTabs');
    container.innerHTML = currentWeekDates.map((dateInfo, index) => `
        <div class="date-tab ${index === selectedDateIndex ? 'active' : ''}"
             data-index="${index}" onclick="selectDate(${index})">
            <div class="day-name">${escapeHtml(dateInfo.day)}</div>
            <div class="day-num">${escapeHtml(dateInfo.month)}/${escapeHtml(dateInfo.dayNum)}</div>
        </div>
    `).join('');

    setTimeout(() => {
        const activeTab = container.querySelector('.date-tab.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 100);
}

// 选择日期
function selectDate(index) {
    selectedDateIndex = index;
    renderDateTabs();
    renderTimeSlots();
}

// 渲染时间段
function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    const selectedDate = currentWeekDates[selectedDateIndex]?.date;

    if (!selectedDate) {
        container.innerHTML = '<div class="error-message">请选择日期</div>';
        return;
    }

    container.innerHTML = periods.map(period => {
        const bookings = allBookings.filter(b => b.date === selectedDate && b.period === period);
        return `
            <div class="time-period">
                <div class="time-slot-header">${escapeHtml(period)}</div>
                <div class="room-cards">
                    ${bookings.length > 0 ? bookings.map(booking => renderRoomCard(booking)).join('') : `
                        <div class="empty-slot">
                            <p>暂无预订</p>
                            <button class="add-booking-btn" onclick="quickBook('${selectedDate}', '${period}')">➕ 添加预订</button>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// 渲染房间卡片 - 修复：使用data-id避免XSS
function renderRoomCard(booking) {
    return `
        <div class="room-card" data-id="${escapeHtml(booking.id)}" onclick="showDetail('${escapeHtml(booking.id)}')">
            <div class="room-card-header">
                <span class="room-number">会议室 ${escapeHtml(booking.room)}</span>
                ${booking.has_leader ? '<span class="vip-badge">⭐ VIP</span>' : ''}
            </div>
            <div class="room-topic">${escapeHtml(booking.topic)}</div>
            <div class="room-info-text">${escapeHtml(booking.booker)} · ${escapeHtml(booking.department)}</div>
        </div>
    `;
}

// 根据ID获取预订信息
function getBookingById(id) {
    return allBookings.find(b => String(b.id) === String(id));
}

// 显示详情 - 修复：使用data-id避免XSS
function showDetail(bookingId) {
    const booking = getBookingById(bookingId);
    if (!booking) {
        alert('预订信息不存在');
        return;
    }

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = '预订详情';

    modalBody.innerHTML = `
        <div class="detail-list">
            <div class="detail-item">
                <span class="detail-label">会议室</span>
                <span class="detail-value">${escapeHtml(booking.room)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">日期</span>
                <span class="detail-value">${escapeHtml(booking.date)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">时间段</span>
                <span class="detail-value">${escapeHtml(booking.period)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">会议主题</span>
                <span class="detail-value">${escapeHtml(booking.topic)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">部门</span>
                <span class="detail-value">${escapeHtml(booking.department)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">预订人</span>
                <span class="detail-value">${escapeHtml(booking.booker)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">联系方式</span>
                <span class="detail-value">${escapeHtml(booking.contact)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">领导参加</span>
                <span class="detail-value">${booking.has_leader ? '是 ⭐' : '否'}</span>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" data-id="${escapeHtml(booking.id)}" onclick="editBooking('${escapeHtml(booking.id)}')">编辑</button>
            <button class="btn btn-danger" data-id="${escapeHtml(booking.id)}" onclick="deleteBooking('${escapeHtml(booking.id)}')">删除</button>
            <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        </div>
    `;

    modal.style.display = 'block';
}

// 编辑预订 - 修复：使用data-id，添加样式
function editBooking(bookingId) {
    const booking = getBookingById(bookingId);
    if (!booking) {
        alert('预订信息不存在');
        return;
    }

    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = '编辑预订';
    modalBody.innerHTML = `
        <form id="editForm" class="booking-form">
            <input type="hidden" id="edit_id" value="${escapeHtml(booking.id)}">
            <div class="form-group">
                <label class="form-label">会议室 *</label>
                <select id="edit_room" class="form-select" required>
                    <option value="1732" ${booking.room === '1732' ? 'selected' : ''}>1732</option>
                    <option value="1711" ${booking.room === '1711' ? 'selected' : ''}>1711</option>
                    <option value="1733" ${booking.room === '1733' ? 'selected' : ''}>1733</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">日期 *</label>
                <input type="date" id="edit_date" class="form-input" value="${escapeHtml(booking.date)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">时间段 *</label>
                <select id="edit_period" class="form-select" required>
                    <option value="上午" ${booking.period === '上午' ? 'selected' : ''}>上午</option>
                    <option value="下午" ${booking.period === '下午' ? 'selected' : ''}>下午</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">会议主题 *</label>
                <input type="text" id="edit_topic" class="form-input" value="${escapeHtml(booking.topic)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">部门 *</label>
                <input type="text" id="edit_department" class="form-input" value="${escapeHtml(booking.department)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">预订人 *</label>
                <input type="text" id="edit_booker" class="form-input" value="${escapeHtml(booking.booker)}" required>
            </div>
            <div class="form-group">
                <label class="form-label">联系方式 *</label>
                <input type="text" id="edit_contact" class="form-input" value="${escapeHtml(booking.contact)}" required>
            </div>
            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="edit_has_leader" ${booking.has_leader ? 'checked' : ''}>
                    <label for="edit_has_leader">有领导参加</label>
                </div>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">保存修改</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;

    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateBooking();
    });
}

// 更新预订 - 修复：添加表单验证
async function updateBooking() {
    const bookingId = document.getElementById('edit_id')?.value;
    if (!bookingId) {
        alert('预订ID不存在');
        return;
    }

    // 表单验证
    const formData = {
        room: document.getElementById('edit_room').value,
        date: document.getElementById('edit_date').value,
        period: document.getElementById('edit_period').value,
        topic: document.getElementById('edit_topic').value.trim(),
        department: document.getElementById('edit_department').value.trim(),
        booker: document.getElementById('edit_booker').value.trim(),
        contact: document.getElementById('edit_contact').value.trim(),
        has_leader: document.getElementById('edit_has_leader').checked
    };

    // 验证必填字段
    if (!formData.room || !formData.date || !formData.period ||
        !formData.topic || !formData.department || !formData.booker || !formData.contact) {
        alert('请填写所有必填字段');
        return;
    }

    try {
        // 检查时间段是否已被预订
        const { data: existing } = await supabaseClient
            .from('booking')
            .select('*')
            .eq('room', formData.room)
            .eq('date', formData.date)
            .eq('period', formData.period)
            .neq('id', bookingId);

        if (existing && existing.length > 0) {
            alert('该时间段已被预订！');
            return;
        }

        const { error } = await supabaseClient
            .from('booking')
            .update(formData)
            .eq('id', bookingId);

        if (error) throw error;

        alert('修改成功！');
        closeModal();
        await loadBookings();
    } catch (error) {
        console.error('修改失败:', error);
        alert('修改失败，请重试');
    }
}

// 快速预订
function quickBook(date, period) {
    showQuickBookModal(date, period);
}

// 显示快速预订弹窗 - 修复：添加样式和验证
function showQuickBookModal(presetDate = null, presetPeriod = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const defaultDate = presetDate || currentWeekDates[selectedDateIndex]?.date || '';
    const defaultPeriod = presetPeriod || '上午';

    modalTitle.textContent = '快速预订';
    modalBody.innerHTML = `
        <form id="quickBookForm" class="booking-form">
            <div class="form-group">
                <label class="form-label">会议室 *</label>
                <select id="quick_room" class="form-select" required>
                    <option value="">请选择</option>
                    <option value="1732">1732</option>
                    <option value="1711">1711</option>
                    <option value="1733">1733</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">日期 *</label>
                <input type="date" id="quick_date" class="form-input" value="${defaultDate}" required>
            </div>
            <div class="form-group">
                <label class="form-label">时间段 *</label>
                <select id="quick_period" class="form-select" required>
                    <option value="上午" ${defaultPeriod === '上午' ? 'selected' : ''}>上午</option>
                    <option value="下午" ${defaultPeriod === '下午' ? 'selected' : ''}>下午</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">会议主题 *</label>
                <input type="text" id="quick_topic" class="form-input" placeholder="请输入会议主题" required>
            </div>
            <div class="form-group">
                <label class="form-label">部门 *</label>
                <input type="text" id="quick_department" class="form-input" placeholder="请输入部门名称" required>
            </div>
            <div class="form-group">
                <label class="form-label">预订人 *</label>
                <input type="text" id="quick_booker" class="form-input" placeholder="请输入预订人姓名" required>
            </div>
            <div class="form-group">
                <label class="form-label">联系方式 *</label>
                <input type="text" id="quick_contact" class="form-input" placeholder="请输入联系方式" required>
            </div>
            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="quick_has_leader">
                    <label for="quick_has_leader">有领导参加</label>
                </div>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">确认预订</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;

    modal.style.display = 'block';

    document.getElementById('quickBookForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitQuickBooking();
    });
}

// 提交快速预订 - 修复：添加表单验证
async function submitQuickBooking() {
    // 表单验证
    const formData = {
        room: document.getElementById('quick_room').value,
        date: document.getElementById('quick_date').value,
        period: document.getElementById('quick_period').value,
        topic: document.getElementById('quick_topic').value.trim(),
        department: document.getElementById('quick_department').value.trim(),
        booker: document.getElementById('quick_booker').value.trim(),
        contact: document.getElementById('quick_contact').value.trim(),
        has_leader: document.getElementById('quick_has_leader').checked
    };

    // 验证必填字段
    if (!formData.room) {
        alert('请选择会议室');
        return;
    }
    if (!formData.date) {
        alert('请选择日期');
        return;
    }
    if (!formData.topic || !formData.department || !formData.booker || !formData.contact) {
        alert('请填写所有必填字段');
        return;
    }

    try {
        // 检查时间段是否已被预订
        const { data: existing } = await supabaseClient
            .from('booking')
            .select('*')
            .eq('room', formData.room)
            .eq('date', formData.date)
            .eq('period', formData.period);

        if (existing && existing.length > 0) {
            alert('该时间段已被预订！');
            return;
        }

        const { error } = await supabaseClient
            .from('booking')
            .insert([formData]);

        if (error) throw error;

        alert('预订成功！');
        closeModal();
        await loadBookings();
    } catch (error) {
        console.error('预订失败:', error);
        alert('预订失败，请重试');
    }
}

// 删除预订
async function deleteBooking(bookingId) {
    if (!confirm('确定要删除此预订吗？')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('booking')
            .delete()
            .eq('id', bookingId);

        if (error) throw error;

        alert('已删除预订');
        closeModal();
        await loadBookings();
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
    }
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}
