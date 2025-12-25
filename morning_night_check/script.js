document.addEventListener('DOMContentLoaded', function () {
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const outputText = document.getElementById('output-text');

    generateBtn.addEventListener('click', generateText);
    copyBtn.addEventListener('click', copyToClipboard);

    function generateText() {
        const date = document.getElementById('date').value;
        const checkType = document.getElementById('check-type').value;
        const dayType = document.getElementById('day-type').value;
        const loadBalance = document.getElementById('load-select').value;

        const sleepScores = getScores('sleep');
        const sitScores = getScores('sit');
        const stepScores = getScores('steps');

        let text = '';

        if (date) {
            text += `【${date} ${checkType}チェック】（${dayType}）\n`;
        } else {
            text += `【${checkType}チェック】（${dayType}）\n`;
        }

        text += `右スネ/アキ/ふく/親指/アーチ/左股\n`;
        text += `寝：${sleepScores}\n`;
        text += `座：${sitScores}\n`;
        text += `立10秒：荷重 ${loadBalance}\n`;
        text += `10歩後：${stepScores}`;

        const notice = document.getElementById('notice-text').value;
        if (notice) {
            text += `\n\n【気づき】\n${notice}`;
        }

        outputText.value = text;
    }

    function getScores(groupName) {
        const selects = document.querySelectorAll(`[data-group="${groupName}"] select`);
        const scores = Array.from(selects).map(select => select.value);
        return scores.join('-');
    }

    function copyToClipboard() {
        const text = outputText.value;
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'コピーしました！';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'コピー';
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    }
});
