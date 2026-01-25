
// ⚠️ 替换成你的 Supabase 配置
const SUPABASE_URL = 'https://lvidoxkbwaeaaiubggyz.supabase.co'
const SUPABASE_KEY = 'sb_publishable_lFYEaCgur3SihqL3XHH4jw_i2BhaFvg'

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// 时间段列表
const timeSlots = ['上午', '下午'];

// 星期列表
const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 会议室列表
const rooms = ['1732', '1711', '1733'];

// 初始化
async function init() {
    await loadBookings();
    setupForm();
}

// 从 Supabase 加载预订数据
async function loadBookings() {
    try {
        const { data, error } = await supabase
            .from('booking')
            .select('*');
        
        if (error) throw error;
        
        renderSchedule(data || []);
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请刷新页面重试');
    }
}

// 渲染周视图表格
function renderSchedule(bookingData) {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';
    
    timeSlots.forEach(timeSlot => {
        const tr = document.createElement('tr');
        
        // 时间段列
        const timeTd = document.createElement('td');
        timeTd.className = 'time-col';
        timeTd.textContent = timeSlot;
        tr.appendChild(timeTd);
        
        // 每天的列
        days.forEach(day => {
            const td = document.createElement('td');
            
            // 查找这个时间段+日期的所有预订
            const dayBookings = bookingData.filter(b => 
                b.day === day && b.time_slot === timeSlot
            );
            
            if (dayBookings.length > 0) {
                dayBookings.forEach(b => {
                    const roomDiv = document.createElement('div');
                    // 根据会议室号分配颜色
                    let roomClass = 'room-A';
                    if (b.room === '1711') roomClass = 'room-B';
                    if (b.room === '1733') roomClass = 'room-C';
                    
                    roomDiv.className = `room-info ${roomClass}`;
                    roomDiv.innerHTML = `
                        <span class="room-name">${b.room}</span><br>
                        <span class="booker-name">${b.booker}</span>
                    `;
                    roomDiv.onclick = () => cancelBooking(b);
                    td.appendChild(roomDiv);
                });
            } else {
                td.innerHTML = '<span class="empty-slot">-</span>';
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

// 设置表单提交
function setupForm() {
    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const room = document.getElementById('room').value;
        const day = document.getElementById('day').value;
        const timeSlot = document.getElementById('timeSlot').value;
        const booker = document.getElementById('booker').value;
        
        try {
            // 检查是否已预订
            const { data: existing } = await supabase
                .from('booking')
                .select('*')
                .eq('room', room)
                .eq('day', day)
                .eq('time_slot', timeSlot);
            
            if (existing && existing.length > 0) {
                alert('该时间段已被预订！');
                return;
            }
            
            // 添加预订
            const { error } = await supabase
                .from('booking')
                .insert([
                    { room, day, time_slot: timeSlot, booker }
                ]);
            
            if (error) throw error;
            
            alert('预订成功！');
            form.reset();
            await loadBookings();
            
        } catch (error) {
            console.error('预订失败:', error);
            alert('预订失败，请重试');
        }
    });
}

// 取消预订
async function cancelBooking(booking) {
    if (confirm(`确定取消 ${booking.room} ${booking.day} ${booking.time_slot} 的预订吗？`)) {
        try {
            const { error } = await supabase
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

// 页面加载时初始化
init();
