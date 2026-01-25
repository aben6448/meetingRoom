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

// 初始化
async function init() {
    initSupabase();
    setDefaultDate();
    await loadBookings();
    setupForm();
}

// 设置默认日期
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// 获取本周日期范围
function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
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

// 加载预订数据
async function loadBookings() {
    try {
        const weekRange = getWeekRange();
        
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
            
            // 找到这个时间段的所有预订
            const dayBookings = bookings.filter(b => 
                getWeekday(b.date) === day && b.period === period
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
                    div.onclick = () => showBookingDetail(booking);
                    td.appendChild(div);
                });
            } else {
                td.innerHTML = '<span class="empty-slot">-</span>';
            }
            
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

// 显示预订详情
async function showBookingDetail(booking) {
    const message = `
会议室：${booking.room}
日期：${booking.date}
时间：${booking.period}
主题：${booking.topic}
部门：${booking.department}
预订人：${booking.booker}
联系方式：${booking.contact}
领导参加：${booking.has_leader ? '是' : '否'}

是否取消此预订？
    `;
    
    if (confirm(message)) {
        try {
            const { error } = await supabaseClient
                .from('booking')
                .delete()
                .eq('id', booking.id);
            
            if (error) throw error;
            
            alert('已取消预订');
            await loadBookings();
            
        } catch (error) {
            console.error('取消失败:', error);
            alert('取消失败，请重试');
        }
    }
}

// 页面加载
init();
