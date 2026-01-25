import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ 替换成你的 Supabase 配置
const SUPABASE_URL = 'https://lvidoxkbwaeaaiubggyz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_lFYEaCgur3SihqL3XHH4jw_i2BhaFvg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 时间段列表
const timeSlots = ['上午', '下午'];

// 星期列表
const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 会议室列表
const rooms = ['1732', '1711', '1733'];

// 预订数据（从 localStorage 的 booking 表读取）
let booking = JSON.parse(localStorage.getItem('booking')) || [];

// 初始化
function init() {
    renderSchedule();
    setupForm();
}

// 渲染周视图表格
function renderSchedule() {
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
            const dayBookings = booking.filter(b => 
                b.day === day && b.timeSlot === timeSlot
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
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const room = document.getElementById('room').value;
        const day = document.getElementById('day').value;
        const timeSlot = document.getElementById('timeSlot').value;
        const booker = document.getElementById('booker').value;
        
        // 检查是否已预订
        const exists = booking.some(b => 
            b.room === room && b.day === day && b.timeSlot === timeSlot
        );
        
        if (exists) {
            alert('该时间段已被预订！');
            return;
        }
        
        // 添加预订
        booking.push({ room, day, timeSlot, booker });
        localStorage.setItem('booking', JSON.stringify(booking));
        
        alert('预订成功！');
        form.reset();
        renderSchedule();
    });
}

// 取消预订
function cancelBooking(b) {
    if (confirm(`确定取消 ${b.room} ${b.day} ${b.timeSlot} 的预订吗？`)) {
        booking = booking.filter(item => 
            !(item.room === b.room && 
              item.day === b.day && 
              item.timeSlot === b.timeSlot)
        );
        localStorage.setItem('booking', JSON.stringify(booking));
        alert('已取消预订');
        renderSchedule();
    }
}

// 页面加载时初始化
init();
