// 等待 Supabase CDN 加载完成后初始化
let supabaseClient;

// 初始化 Supabase
function initSupabase() {
    const SUPABASE_URL = 'https://lvidoxkbwaeaaiubggyz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_lFYEaCgur3SihqL3XHH4jw_i2BhaFvg';
    
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}


// 时间段
const periods = ['上午', '下午'];

// 星期映射
const dayMap = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    0: '周日'
};

// 当前周偏移量（0表示本周，-1表示上周，1表示下周）
let currentWeekOffset = 0;

// 存储当前周的日期范围
let currentWeekDates = {};

// 初始化
async function init() {
    initSupabase();
    setDefaultDate();
    await loadBookings();
    setupForm();
    setupWeekNavigation();
    setupModal();
}

// 设置默认日期
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// 获取指定周的日期范围
function getWeekRange(offset = 0) {
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7)); // 偏移周数
    
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // 保存每天的具体日期
    currentWeekDates = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dayName = dayMap[(i + 1) % 7];
        currentWeekDates[dayName] = date.toISOString().split('T')[0];
    }
    
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

// 从日期获取星期
function getWeekday(dateString) {
    const date = new Date(dateString);
    return dayMap[date.getDay()];
}

// 更新周标题
function updateWeekTitle(weekRange) {
    const title = document.getElementById('weekTitle');
    if (currentWeekOffset === 0) {
        title.textContent = `本周预订情况 (${weekRange.start} ~ ${weekRange.end})`;
    } else if (currentWeekOffset > 0) {
        title.textContent = `${currentWeekOffset}周后 (${weekRange.start} ~ ${weekRange.end})`;
    } else {
        title.textContent = `${Math.abs(currentWeekOffset)}周前 (${weekRange.start} ~ ${weekRange.end})`;
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
        updateWeekTitle(weekRange);
        
        const { data, error } = await supabaseClient
            .from('booking')
            .select('*')
            .gte('date', weekRange.start)
            .lte('date', weekRange.end)
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        renderSchedule(data || []);
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请刷新页面重试');
    }
}

// 渲染表格
function renderSchedule(bookings) {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';
    
    periods.forEach(period => {
        const tr = document.createElement('tr');
        
        // 时间段列
        const timeTd = document.createElement('td');
        timeTd.className = 'time-col';
        timeTd.textContent = period;
        tr.appendChild(timeTd);
        
        // 每天的列
        Object.values(dayMap).forEach(day => {
            const td = document.createElement('td');
            const cellDate = currentWeekDates[day];
            
            // 找到这个时间段的所有预订
            const dayBookings = bookings.filter(b => 
                b.date === cellDate && b.period === period
            );
            
            if (dayBookings.length > 0) {
                dayBookings.forEach(booking => {
                    const div = document.createElement('div');
                    
                    // 根据会议室分配样式
                    let roomClass = 'room-A';
                    if (booking.room === '1711') roomClass = 'room-B';
                    if (booking.room === '1733') roomClass = 'room-C';
                    
                    div.className = `room-info ${roomClass}`;
                    div.innerHTML = `
                        <span class="room-name">${booking.room}</span><br>
                        <span class="booker-name">${booking.topic}</span><br>
                        <span class="booker-name">${booking.booker}</span>
                        ${booking.has_leader ? ' ⭐' : ''}
                    `;
                    div.onclick = (e) => {
                        e.stopPropagation();
                        showBookingDetail(booking);
                    };
                    td.appendChild(div);
                });
            } else {
                td.innerHTML = '<span class="empty-slot">-</span>';
            }
            
            // 为空白格子添加点击事件
            td.onclick = () => {
                if (dayBookings.length === 0) {
                    showQuickBookingForm(cellDate, period);
                }
            };
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

// 表单提交
function setupForm() {
    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            room: document.getElementById('room').value,
            date: document.getElementById('date').value,
            period: document.getElementById('period').value,
            topic: document.getElementById('topic').value,
            department: document.getElementById('department').value,
            booker: document.getElementById('booker').value,
            contact: document.getElementById('contact').value,
            has_leader: document.getElementById('has_leader').checked
        };
        
        try {
            // 检查冲突
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
            
            // 添加预订
            const { error } = await supabaseClient
                .from('booking')
                .insert([formData]);
            
            if (error) throw error;
            
            alert('预订成功！');
            form.reset();
            setDefaultDate();
            await loadBookings();
            
        } catch (error) {
            console.error('预订失败:', error);
            alert('预订失败，请重试');
        }
    });
}

// 设置弹窗
function setupModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// 显示预订详情
function showBookingDetail(booking) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '预订详情';
    
    modalBody.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">会议室：</span>
            <span class="detail-value">${booking.room}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">日期：</span>
            <span class="detail-value">${booking.date}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">时间段：</span>
            <span class="detail-value">${booking.period}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">会议主题：</span>
            <span class="detail-value">${booking.topic}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">部门：</span>
            <span class="detail-value">${booking.department}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">预订人：</span>
            <span class="detail-value">${booking.booker}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">联系方式：</span>
            <span class="detail-value">${booking.contact}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">领导参加：</span>
            <span class="detail-value">${booking.has_leader ? '是 ⭐' : '否'}</span>
        </div>
        <div class="modal-actions">
            <button class="btn-delete" onclick="deleteBooking(${booking.id})">删除预订</button>
            <button class="btn-cancel" onclick="closeModal()">关闭</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

// 显示快速预订表单
function showQuickBookingForm(date, period) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '快速预订';
    
    modalBody.innerHTML = `
        <form id="quickBookingForm" class="quick-booking-form">
            <label>
                会议室：
                <select id="quick_room" required>
                    <option value="">请选择</option>
                    <option value="1732">1732</option>
                    <option value="1711">1711</option>
                    <option value="1733">1733</option>
                </select>
            </label>
            
            <label>
                日期：
                <input type="date" id="quick_date" value="${date}" readonly>
            </label>
            
            <label>
                时间段：
                <input type="text" id="quick_period" value="${period}" readonly>
            </label>
            
            <label>
                会议主题：
                <input type="text" id="quick_topic" required placeholder="请输入会议主题">
            </label>
            
            <label>
                部门：
                <input type="text" id="quick_department" required placeholder="请输入部门">
            </label>
            
            <label>
                预订人：
                <input type="text" id="quick_booker" required placeholder="请输入姓名">
            </label>
            
            <label>
                联系方式：
                <input type="tel" id="quick_contact" required placeholder="请输入联系方式">
            </label>
            
            <label class="checkbox-label">
                <input type="checkbox" id="quick_has_leader">
                有领导参加
            </label>
            
            <div class="modal-actions">
                <button type="submit" style="background-color: #4CAF50;">确认预订</button>
                <button type="button" class="btn-cancel" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    
    // 绑定快速预订表单提交事件
    document.getElementById('quickBookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await quickBooking();
    });
}

// 快速预订
async function quickBooking() {
    const formData = {
        room: document.getElementById('quick_room').value,
        date: document.getElementById('quick_date').value,
        period: document.getElementById('quick_period').value,
        topic: document.getElementById('quick_topic').value,
        department: document.getElementById('quick_department').value,
        booker: document.getElementById('quick_booker').value,
        contact: document.getElementById('quick_contact').value,
        has_leader: document.getElementById('quick_has_leader').checked
    };
    
    try {
        // 检查冲突
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
        
        // 添加预订
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

// 页面加载
init();
