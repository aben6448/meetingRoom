import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ 替换成你的 Supabase 配置
const SUPABASE_URL = 'https://lvidoxkbwaeaaiubggyz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_lFYEaCgur3SihqL3XHH4jw_i2BhaFvg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 全局状态
let currentWeekStart = getMonday(new Date())
let rooms = ['1732', '1711', '1733']
let bookings = []
let currentSlot = null

// 初始化
document.addEventListener('DOMContentLoaded', init)

async function init() {
  setupEventListeners()
  await loadBookings()
  render()
}

// 事件监听
function setupEventListeners() {
  document.getElementById('prev-week').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, -7)
    loadBookings()
  })
  
  document.getElementById('next-week').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, 7)
    loadBookings()
  })
  
  document.getElementById('close-modal').addEventListener('click', closeModal)
  document.getElementById('booking-form').addEventListener('submit', handleSubmit)
  document.getElementById('delete-btn').addEventListener('click', handleDelete)
  
  // 点击遮罩关闭
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal()
  })
}

// 加载预定数据
async function loadBookings() {
  document.getElementById('loading').style.display = 'block'
  
  const weekEnd = addDays(currentWeekStart, 4) // 周一到周五
  
  const { data, error } = await supabase
    .from('booking')
    .select('*')
    .gte('date', formatDate(currentWeekStart))
    .lte('date', formatDate(weekEnd))
  
  document.getElementById('loading').style.display = 'none'
  
  if (error) {
    alert('加载失败：' + error.message)
    return
  }
  
  bookings = data || []
  render()
}

// 渲染页面
function render() {
  renderWeekDisplay()
  renderGrid()
}

function renderWeekDisplay() {
  const weekEnd = addDays(currentWeekStart, 4)
  const display = `${formatDate(currentWeekStart, 'MM-DD')} ~ ${formatDate(weekEnd, 'MM-DD')}`
  document.getElementById('week-display').textContent = display
}

function renderGrid() {
  const grid = document.getElementById('bookings-grid')
  grid.innerHTML = ''
  
  rooms.forEach(room => {
    const section = document.createElement('div')
    section.className = 'room-section'
    
    const roomName = document.createElement('div')
    roomName.className = 'room-name'
    roomName.textContent = room
    section.appendChild(roomName)
    
    const daysGrid = document.createElement('div')
    daysGrid.className = 'days-grid'
    
    for (let i = 0; i < 5; i++) {
      const date = addDays(currentWeekStart, i)
      const dayCard = createDayCard(room, date)
      daysGrid.appendChild(dayCard)
    }
    
    section.appendChild(daysGrid)
    grid.appendChild(section)
  })
}

function createDayCard(room, date) {
  const card = document.createElement('div')
  card.className = 'day-card'
  
  const header = document.createElement('div')
  header.className = 'day-header'
  header.textContent = formatDate(date, 'MM-DD ddd')
  card.appendChild(header)
  
  ;['上午', '下午'].forEach(period => {
    const slot = createPeriodSlot(room, date, period)
    card.appendChild(slot)
  })
  
  return card
}

function createPeriodSlot(room, date, period) {
  const slot = document.createElement('div')
  slot.className = 'period-slot'
  
  const booking = findBooking(room, date, period)
  
  if (booking) {
    slot.classList.add('booked')
    if (booking.has_leader) {
      slot.classList.add('has-leader')
    }
    
    slot.innerHTML = `
      <div class="period-label">${period}</div>
      <div class="booking-info">
        <div class="booking-topic">${booking.topic}</div>
        <div class="booking-details">${booking.booker} · ${booking.department}</div>
      </div>
    `
  } else {
    slot.innerHTML = `
      <div class="period-label">${period}</div>
      <div style="color:#999; font-size:0.85rem;">点击预定</div>
    `
  }
  
  slot.addEventListener('click', () => openModal(room, date, period, booking))
  
  return slot
}

// 查找预定
function findBooking(room, date, period) {
  return bookings.find(b => 
    b.room === room && 
    b.date === formatDate(date) && 
    b.period === period
  )
}

// 打开弹窗
function openModal(room, date, period, booking) {
  currentSlot = { room, date, period, booking }
  
  document.getElementById('room').value = room
  document.getElementById('datetime').value = `${formatDate(date, 'YYYY-MM-DD')} ${period}`
  
  if (booking) {
    document.getElementById('modal-title').textContent = '查看/编辑预定'
    document.getElementById('topic').value = booking.topic
    document.getElementById('department').value = booking.department
    document.getElementById('booker').value = booking.booker
    document.getElementById('contact').value = booking.contact
    document.getElementById('has-leader').checked = booking.has_leader
    document.getElementById('delete-btn').style.display = 'block'
  } else {
    document.getElementById('modal-title').textContent = '预定会议室'
    document.getElementById('booking-form').reset()
    document.getElementById('room').value = room
    document.getElementById('datetime').value = `${formatDate(date, 'YYYY-MM-DD')} ${period}`
    document.getElementById('delete-btn').style.display = 'none'
  }
  
  document.getElementById('modal').classList.add('active')
}

function closeModal() {
  document.getElementById('modal').classList.remove('active')
  currentSlot = null
}

// 提交预定
async function handleSubmit(e) {
  e.preventDefault()
  
  const data = {
    room: currentSlot.room,
    date: formatDate(currentSlot.date),
    period: currentSlot.period,
    topic: document.getElementById('topic').value,
    department: document.getElementById('department').value,
    booker: document.getElementById('booker').value,
    contact: document.getElementById('contact').value,
    has_leader: document.getElementById('has-leader').checked
  }
  
  let result
  if (currentSlot.booking) {
    // 更新
    result = await supabase
      .from('booking')
      .update(data)
      .eq('id', currentSlot.booking.id)
  } else {
    // 新增
    result = await supabase
      .from('booking')
      .insert(data)
  }
  
  if (result.error) {
    alert('操作失败：' + result.error.message)
    return
  }
  
  closeModal()
  await loadBookings()
}

// 删除预定
async function handleDelete() {
  if (!confirm('确认删除此预定？')) return
  
  const { error } = await supabase
    .from('booking')
    .delete()
    .eq('id', currentSlot.booking.id)
  
  if (error) {
    alert('删除失败：' + error.message)
    return
  }
  
  closeModal()
  await loadBookings()
}

// 工具函数
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('ddd', weekdays[d.getDay()])
}
