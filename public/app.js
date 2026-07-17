const RADIUS = 55;
const CIRC = 2 * Math.PI * RADIUS;
['ringDays','ringHours','ringMinutes','ringSeconds'].forEach(id=>{
  const el = document.getElementById(id);
  el.style.strokeDasharray = CIRC;
  el.style.strokeDashoffset = CIRC;
});

let role = null;
let targetDate = null;
let eventName = 'Sự kiện đặc biệt';
let timerInterval = null;

// Kiểm tra xem đã có phiên đăng nhập hợp lệ chưa (cookie httpOnly do server quản lý)
async function checkSession(){
  try{
    const res = await fetch('/api/me');
    if (res.ok){
      const data = await res.json();
      role = data.role;
      await enterApp();
    }
  }catch(e){ /* chưa đăng nhập, ở lại màn hình đăng nhập */ }
}

async function doLogin(){
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';

  if (!password){
    errEl.textContent = 'Vui lòng nhập mật khẩu.';
    return;
  }

  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (!res.ok){
      errEl.textContent = data.error || 'Đăng nhập thất bại.';
      return;
    }

    role = data.role;
    document.getElementById('password').value = '';
    await enterApp();
  }catch(e){
    errEl.textContent = 'Không thể kết nối tới máy chủ.';
  }
}

async function doLogout(){
  await fetch('/api/logout', { method: 'POST' });
  role = null;
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('editPanel').style.display = 'none';
}

async function enterApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'flex';

  const badge = document.getElementById('roleBadge');
  badge.textContent = role === 'admin' ? 'Quản trị viên' : 'Người đặc biệt';
  badge.className = 'badge ' + (role === 'admin' ? 'admin' : 'user');

  const editBtn = document.getElementById('editToggleBtn');
  if (role === 'admin'){
    editBtn.style.display = 'inline-block';
  } else {
    editBtn.style.display = 'none';
    document.getElementById('editPanel').style.display = 'none';
  }

  await loadCountdownData();
  startTimer();
}

async function loadCountdownData(){
  const res = await fetch('/api/countdown');
  if (!res.ok) return;
  const data = await res.json();

  targetDate = new Date(data.targetDate);
  eventName = data.eventName;
  document.getElementById('eventNameDisplay').textContent = eventName;

  document.getElementById('editEventName').value = eventName;
  document.getElementById('editDateTime').value = toLocalInputValue(targetDate);
}

function toLocalInputValue(date){
  const pad = n => String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toggleEditPanel(){
  const panel = document.getElementById('editPanel');
  panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
}

async function saveCountdown(){
  const nameVal = document.getElementById('editEventName').value.trim() || 'Sự kiện đặc biệt';
  const dtVal = document.getElementById('editDateTime').value;
  const msgEl = document.getElementById('saveMsg');

  if (!dtVal){
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'Vui lòng chọn ngày & giờ.';
    return;
  }

  try{
    const res = await fetch('/api/countdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: nameVal, targetDate: new Date(dtVal).toISOString() })
    });
    const data = await res.json();

    if (!res.ok){
      msgEl.style.color = 'var(--danger)';
      msgEl.textContent = data.error || 'Lưu thất bại.';
      return;
    }

    targetDate = new Date(data.targetDate);
    eventName = data.eventName;
    document.getElementById('eventNameDisplay').textContent = eventName;

    msgEl.style.color = 'var(--accent)';
    msgEl.textContent = 'Đã lưu thành công!';
    setTimeout(()=>{ msgEl.textContent=''; }, 2500);
  }catch(e){
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'Không thể kết nối tới máy chủ.';
  }
}

function setRingProgress(id, fraction){
  const el = document.getElementById(id);
  const offset = CIRC * (1 - Math.max(0, Math.min(1, fraction)));
  el.style.strokeDashoffset = offset;
}

function updateCountdown(){
  if (!targetDate) return;
  const now = new Date();
  let diff = targetDate.getTime() - now.getTime();

  const finishedMsg = document.getElementById('finishedMsg');
  if (diff <= 0){
    diff = 0;
    finishedMsg.style.display = 'block';
  } else {
    finishedMsg.style.display = 'none';
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  document.getElementById('numDays').textContent = String(days).padStart(2,'0');
  document.getElementById('numHours').textContent = String(hours).padStart(2,'0');
  document.getElementById('numMinutes').textContent = String(minutes).padStart(2,'0');
  document.getElementById('numSeconds').textContent = String(seconds).padStart(2,'0');

  setRingProgress('ringDays', Math.min(days, 30) / 30);
  setRingProgress('ringHours', hours / 24);
  setRingProgress('ringMinutes', minutes / 60);
  setRingProgress('ringSeconds', seconds / 60);
}

function startTimer(){
  updateCountdown();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateCountdown, 1000);
}

checkSession();
