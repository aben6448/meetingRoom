// 等待 Supabase CDN 加载完成后初始化
let supabaseClient;

// 初始化 Supabase
function initSupabase() {
    const SUPABASE_URL = 'https://lvidoxkbwaeaaiubggyz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_lFYEaCgur3SihqL3XHH4jw_i2BhaFvg';
    
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const periods = ['上午', '下午'];  
const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];  

let currentWeekOffset = 0;  
let currentWeekDates = [];  
let selectedDateIndex = 0; // 当前选中的日期索引  
let allBookings = [];  

// 初始化  
async function init() {  
    initSupabase();  
    await loadBookings();  
    setupWeekNavigation();  
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
            date: date.toISOString().split('T')[0],  
            day: dayNames[(i + 1) % 7],  
            month: date.getMonth() + 1,  
            dayNum: date.getDate()  
        });  
    }  
    
    // 默认选中今天或周一  
    const today = new Date().toISOString().split('T')[0];  
    selectedDateIndex = currentWeekDates.findIndex(d => d.date === today);  
    if (selectedDateIndex === -1) selectedDateIndex = 0;  
    
    return {  
        start: currentWeekDates[0].date,  
        end: currentWeekDates[6].date  
    };  
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
        alert('加载数据失败，请刷新页面重试');  
    }  
}  

// 渲染日期标签页  
function renderDateTabs() {  
    const container = document.getElementById('dateTabs');  
    container.innerHTML = currentWeekDates.map((dateInfo, index) => `  
        <div class="date-tab ${index === selectedDateIndex ? 'active' : ''}"   
             onclick="selectDate(${index})">  
            <div class="date-tab-day">${dateInfo.day}</div>  
            <div class="date-tab-date">${dateInfo.month}/${dateInfo.dayNum}</div>  
        </div>  
    `).join('');  
    
    // 滚动到选中的标签  
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
    const selectedDate = currentWeekDates[selectedDateIndex].date;  
    
    container.innerHTML = periods.map(period => {  
        const bookings = allBookings.filter(b => b.date === selectedDate && b.period === period);  
        
        return `  
            <div class="time-slot">  
                <div class="time-slot-header">${period}</div>  
                <div class="room-cards">  
                    ${bookings.length > 0 ?   
                        bookings.map(booking => renderRoomCard(booking)).join('') :  
                        `<div class="empty-slot">暂无预订</div>  
                         <button class="add-booking-btn" onclick="quickBook('${selectedDate}', '${period}')">  
                            ➕ 添加预订  
                         </button>`  
                    }  
                </div>  
            </div>  
        `;  
    }).join('');  
}  

// 渲染房间卡片  
function renderRoomCard(booking) {  
    return `  
        <div class="room-card room-${booking.room}" onclick='showDetail(${JSON.stringify(booking)})'>  
            <div class="room-card-header">  
                <span class="room-number">会议室 ${booking.room}</span>  
                ${booking.has_leader ? '<span class="vip-badge">⭐ VIP</span>' : ''}  
            </div>  
            <div class="room-topic">${booking.topic}</div>  
            <div class="room-info-text">${booking.booker} · ${booking.department}</div>  
        </div>  
    `;  
}  

// 显示详情  
function showDetail(booking) {  
    const modal = document.getElementById('modal');  
    const modalTitle = document.getElementById('modalTitle');  
    const modalBody = document.getElementById('modalBody');  
    
    modalTitle.textContent = '预订详情';  
    
    modalBody.innerHTML = `  
        <div class="detail-list">  
            <div class="detail-item">  
                <span class="detail-label">会议室</span>  
                <span class="detail-value">${booking.room}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">日期</span>  
                <span class="detail-value">${booking.date}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">时间段</span>  
                <span class="detail-value">${booking.period}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">会议主题</span>  
                <span class="detail-value">${booking.topic}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">部门</span>  
                <span class="detail-value">${booking.department}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">预订人</span>  
                <span class="detail-value">${booking.booker}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">联系方式</span>  
                <span class="detail-value">${booking.contact}</span>  
            </div>  
            <div class="detail-item">  
                <span class="detail-label">领导参加</span>  
                <span class="detail-value">${booking.has_leader ? '是 ⭐' : '否'}</span>  
            </div>  
        </div>  
        <div class="modal-actions">  
            <button class="btn btn-primary" onclick='editBooking(${JSON.stringify(booking)})'>编辑</button>  
            <button class="btn btn-danger" onclick="deleteBooking(${booking.id})">删除</button>  
            <button class="btn btn-secondary" onclick="closeModal()">关闭</button>  
        </div>  
    `;  
    
    modal.style.display = 'block';  
}  

// 编辑预订  
function editBooking(booking) {  
    const modalTitle = document.getElementById('modalTitle');  
    const modalBody = document.getElementById('modalBody');  
    
    modalTitle.textContent = '编辑预订';  
    
    modalBody.innerHTML = `  
        <form id="editForm" class="booking-form">  
            <input type="hidden" id="edit_id" value="${booking.id}">  
            
            <div class="form-group">  
                <label class="form-label">会议室</label>  
                <select id="edit_room" class="form-select" required>  
                    <option value="1732" ${booking.room === '1732' ? 'selected' : ''}>1732</option>  
                    <option value="1711" ${booking.room === '1711' ? 'selected' : ''}>1711</option>  
                    <option value="1733" ${booking.room === '1733' ? 'selected' : ''}>1733</option>  
                </select>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">日期</label>  
                <input type="date" id="edit_date" class="form-input" value="${booking.date}" required>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">时间段</label>  
                <select id="edit_period" class="form-select" required>  
                    <option value="上午" ${booking.period === '上午' ? 'selected' : ''}>上午</option>  
                    <option value="下午" ${booking.period === '下午' ? 'selected' : ''}>下午</option>  
                </select>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">会议主题</label>  
                <input type="text" id="edit_topic" class="form-input" value="${booking.topic}" required>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">部门</label>  
                <input type="text" id="edit_department" class="form-input" value="${booking.department}" required>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">预订人</label>  
                <input type="text" id="edit_booker" class="form-input" value="${booking.booker}" required>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">联系方式</label>  
                <input type="tel" id="edit_contact" class="form-input" value="${booking.contact}" required>  
            </div>  
            
            <div class="form-group checkbox-group">  
                <input type="checkbox" id="edit_has_leader" ${booking.has_leader ? 'checked' : ''}>  
                <label for="edit_has_leader">有领导参加</label>  
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

// 显示快速预订弹窗  
function showQuickBookModal(presetDate = null, presetPeriod = null) {  
    const modal = document.getElementById('modal');  
    const modalTitle = document.getElementById('modalTitle');  
    const modalBody = document.getElementById('modalBody');  
    
    const defaultDate = presetDate || currentWeekDates[selectedDateIndex].date;  
    const defaultPeriod = presetPeriod || '上午';  
    
    modalTitle.textContent = '快速预订';  
    
    modalBody.innerHTML = `  
        <form id="quickBookForm" class="booking-form">  
            <div class="form-group">  
                <label class="form-label">会议室</label>  
                <select id="quick_room" class="form-select" required>  
                    <option value="">请选择</option>  
                    <option value="1732">1732</option>  
                    <option value="1711">1711</option>  
                    <option value="1733">1733</option>  
                </select>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">日期</label>  
                <input type="date" id="quick_date" class="form-input" value="${defaultDate}" required>  
            </div>  
            
            <div class="form-group">  
                <label class="form-label">时间段</label>  
                <select id="quick_period" class="form-select" required>  
                    <option value="上午" ${defaultPeriod === '上午' ? 'selected' : ''}>上午</option>  
                    <option value="下午" ${defaultPeriod === '下午' ? 'selected' : ''}>下午</option>  
                </select>  
            </div>  
            
