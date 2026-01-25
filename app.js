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
const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 当前周偏移量（0表示本周，-1表示上周，1表示下周）
let currentWeekOffset = 0;

// 存储当前周的日期（按顺序：周一到周日）
let currentWeekDates = [];

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

// 获取指定周的日期范围（周一到周日）
function getWeekRange(offset = 0) {
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7)); // 偏移周数
    
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const monday = new Date(now);
    
    // 计算本周一的日期
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // 保存本周每天的日期（周一到周日）
    currentWeekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        currentWeekDates.push(date.toISOString().split('T')[0]);
    }
    
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

// 格式化日期显示（月-日）
function formatDate(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
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

// 渲染表头（带日期）
function renderTableHeader() {
    const thead = document.getElementById('tableHead');
    thead.innerHTML = `
        <tr>
            <th class="time-col">时间段</th>
            <th>周一<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[0])}</span></th>
            <th>周二<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[1])}</span></th>
            <th>周三<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[2])}</span></th>
            <th>周四<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[3])}</span></th>
            <th>周五<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[4])}</span></th>
            <th>周六<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[5])}</span></th>
            <th>周日<br><span style="font-size: 0.85em; font-weight: normal;">${formatDate(currentWeekDates[6])}</span></th>
        </tr>
    `;
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
        renderTableHeader();
        
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
        
        // 遍历周一到周日（currentWeekDates 已经是正确顺序）
        currentWeekDates.forEach(cellDate => {
            const td = document.createElement('td');
            
            // 找到这个日期+时间段的所有预订
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

// 显示预订详情（可编辑）
function showBookingDetail(booking) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '预订详情';
    
    modalBody.innerHTML = `
        <form id="editBookingForm" class="quick-booking-form">
            <input type="hidden" id="edit_id" value="${booking.id}">
            
            <label>
                会议室：
                <select id="edit_room" required>
                    <option value="1732" ${booking.room === '1732' ? 'selected' : ''}>1732</option>
                    <option value="1711" ${booking.room === '1711' ? 'selected' : ''}>1711</option>
                    <option value="1733" ${booking.room === '1733' ? 'selected' : ''}>1733</option>
                </select>
            </label>
            
            <label>
                日期：
                <input type="date" id="edit_date" value="${booking.date}" required>
            </label>
            
            <label>
                时间段：
                <select id="edit_period" required>
                    <option value="上午" ${booking.period === '上午' ? 'selected' : ''}>上午</option>
                    <option value="下午" ${booking.period === '下午' ? 'selected' : ''}>下午</option>
                </select>
            </label>
            
            <label>
                会议主题：
                <input type="text" id="edit_topic" value="${booking.topic}" required>
            </label>
            
            <label>
                部门：
                <input type="text" id="edit_department" value="${booking.department}" required>
            </label>
            
            <label>
                预订人：
                <input type="text" id="edit_booker" value="${booking.booker}" required>
            </label>
            
            <label>
                联系方式：
                <input type="tel" id="edit_contact" value="${booking.contact}" required>
            </label>
            
            <label class="checkbox-label">
                <input type="checkbox" id="edit_has_leader" ${booking.has_leader ? 'checked' : ''}>
                有领导参加
            </label>
            
            <div class="modal-actions">
                <button type="submit" style="background-color: #4CAF50;">保存修改</button>
                <button type="button" class="btn-delete" onclick="deleteBooking(${booking.id})">删除预订</button>
                <button type="button" class="btn-cancel" onclick="closeModal()">取消</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    
    // 绑定编辑表单提交事件
    document.getElementById('editBookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateBooking();
    });
}

// 更新预订
async function updateBooking() {
    const bookingId = document.getElementById('edit_id').value;
    const formData = {
        room: document.getElementById('edit_room').value,
        date: document.getElementById('edit_date').value,
        period: document.getElementById('edit_period').value,
        topic: document.getElementById('edit_topic').value,
        department: document.getElementById('edit_department').value,
        booker: document.getElementById('edit_booker').value,
        contact: document.getElementById('edit_contact').value,
        has_leader: document.getElementById('edit_has_leader').checked
    };
    
    try {
        // 检查是否与其他预订冲突（排除当前记录）
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
        
        // 更新预订
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
