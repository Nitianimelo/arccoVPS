const text = "O agente diz: [Link](https://gfkycxdbbzczrwikhcpr.supabase.co/storage/v1/object/public/chat-uploads/1771629308-test.pdf) aqui!";
const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+)/g;

let tokenCount = 0;
let match;
linkRegex.lastIndex = 0;
while ((match = linkRegex.exec(text))) {
    console.log("Match:", match[0]);

    let title = '';
    let url = '';
    if (match[2]) {
        title = match[1];
        url = match[2];
    } else if (match[3]) {
        url = match[3];
    }

    const lowerUrl = url.toLowerCase();

    console.log("URL:", lowerUrl);
    let fileType = null;
    if (lowerUrl.includes('.pdf')) fileType = 'pdf';
    else if (lowerUrl.includes('.xlsx')) fileType = 'excel';

    console.log("File Type:", fileType);
}
