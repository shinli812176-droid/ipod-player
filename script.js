// --- 1. 歌單初始化與結構升級 ---
// 我們現在改存 "物件 Object"，包含 id 和 title
var savedPlaylist = JSON.parse(localStorage.getItem('myIpodPlaylist_v2')); // 換個 key 避免讀到舊格式出錯
var playlist = savedPlaylist || [
    { id: 'jfKfPfyJRdk', title: 'Lofi Girl - beats to relax/study to' },
    { id: '5qap5aO4i9A', title: 'Lofi Hip Hop Radio' }
];

var currentSongIndex = 0;
var player;

// --- 2. 載入 YouTube API ---
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
if (firstScriptTag) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    document.head.appendChild(tag);
}

function onYouTubeIframeAPIReady() {
    document.getElementById('status-text').innerText = "Ready to Play";
    renderPlaylist(); 
    
    // 初始化播放器，注意這裡讀取的是 playlist[i].id
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: playlist[currentSongIndex].id, 
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'rel': 0 },
        events: {
            'onReady': onPlayerReady,
            'onError': onPlayerError,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    document.getElementById('status-text').style.display = 'none';
    updateActiveSongStyle();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        nextSong();
    }
}

function onPlayerError(event) {
    // 錯誤處理 (150/101 為版權限制)
    if(event.data === 150 || event.data === 101) {
        setTimeout(nextSong, 1000); 
    }
}

// --- 3. 歌單管理系統 (核心修改區) ---

function openMenu() {
    document.getElementById('menu-screen').style.display = 'flex';
    renderPlaylist();
}

function closeMenu() {
    document.getElementById('menu-screen').style.display = 'none';
}

// ★ 新增功能：加入歌曲時自動抓取標題
function addSong() {
    var input = document.getElementById('url-input');
    var btn = document.querySelector('.add-btn');
    var url = input.value;
    var id = extractVideoID(url);

    if (!id) {
        alert("無效的 YouTube 網址");
        return;
    }

    // 介面變更：讓使用者知道正在抓資料
    var originalBtnText = btn.innerText;
    btn.innerText = "抓取標題中...";
    btn.disabled = true;

    // 使用 noembed 服務抓取標題
    fetch('https://noembed.com/embed?url=https://www.youtube.com/watch?v=' + id)
        .then(response => response.json())
        .then(data => {
            var songTitle = data.title || "未知標題 (" + id + ")"; // 如果抓不到就用 ID 代替
            
            // 把「物件」存進陣列
            playlist.push({
                id: id,
                title: songTitle
            });

            saveToStorage();
            renderPlaylist();
            input.value = ""; // 清空輸入框
            
            // 恢復按鈕
            btn.innerText = originalBtnText;
            btn.disabled = false;
        })
        .catch(error => {
            // 萬一抓取失敗，還是允許加入，但標題顯示 ID
            playlist.push({ id: id, title: "Track " + id });
            saveToStorage();
            renderPlaylist();
            input.value = "";
            btn.innerText = originalBtnText;
            btn.disabled = false;
            alert("標題抓取失敗，已加入 ID");
        });
}

function clearPlaylist() {
    if(confirm("確定要清空所有歌曲嗎？")) {
        playlist = [];
        saveToStorage();
        renderPlaylist();
    }
}

function saveToStorage() {
    localStorage.setItem('myIpodPlaylist_v2', JSON.stringify(playlist));
    document.getElementById('song-count').innerText = playlist.length;
}

// 畫面繪製：現在顯示 title 而不是 id
function renderPlaylist() {
    var listDiv = document.getElementById('playlist-list');
    var countSpan = document.getElementById('song-count');
    
    listDiv.innerHTML = "";
    countSpan.innerText = playlist.length;

    if (playlist.length === 0) {
        listDiv.innerHTML = '<div class="empty-hint">目前沒有歌曲<br>請在下方貼上網址</div>';
        return;
    }

    playlist.forEach(function(song, index) {
        var item = document.createElement('div');
        item.className = 'playlist-item';
        if (index === currentSongIndex) {
            item.className += ' active';
        }
        
        // ★ 這裡修改了：顯示 (1. 標題)
        item.innerText = (index + 1) + ". " + song.title;
        
        item.onclick = function() {
            playSpecificSong(index);
        };
        
        listDiv.appendChild(item);
    });
}

function playSpecificSong(index) {
    currentSongIndex = index;
    loadAndPlay(currentSongIndex);
    closeMenu();
}

function extractVideoID(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

// --- 4. 播放控制 ---

function togglePlay() {
    if (!player || !player.getPlayerState) return;
    if (document.getElementById('menu-screen').style.display === 'flex') {
        closeMenu();
        return;
    }
    
    var state = player.getPlayerState();
    if (state == 1) player.pauseVideo();
    else player.playVideo();
}

function nextSong() {
    currentSongIndex++;
    if (currentSongIndex >= playlist.length) currentSongIndex = 0;
    loadAndPlay(currentSongIndex);
}

function prevSong() {
    currentSongIndex--;
    if (currentSongIndex < 0) currentSongIndex = playlist.length - 1;
    loadAndPlay(currentSongIndex);
}

function loadAndPlay(index) {
    if (player && playlist[index]) {
        // 注意：載入時要指定 .id
        player.loadVideoById(playlist[index].id);
        updateActiveSongStyle();
    }
}

function updateActiveSongStyle() {
    renderPlaylist(); 
}