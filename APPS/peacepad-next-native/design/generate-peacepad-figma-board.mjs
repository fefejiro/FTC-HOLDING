import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const output = resolve(import.meta.dirname, 'peacepad-native-v2-family-first.svg');
const palette = {
  canvas: '#F7F3EE',
  background: '#FFF8F2',
  surface: '#FFFFFF',
  ink: '#26153A',
  muted: '#6E6275',
  plum: '#6B4A86',
  plumSoft: '#F3E7F1',
  coral: '#F26B5E',
  sun: '#F7C948',
  aqua: '#2E9D91',
  aquaSoft: '#E6F5F1',
  cream: '#FFF1DF',
  line: '#E8DFD5',
};

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const rect = (x, y, width, height, radius, fill, stroke = 'none', strokeWidth = 0) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

const text = (x, y, value, size = 16, weight = 500, fill = palette.ink, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;

const icon = (kind, x, y, color = palette.ink) => {
  const common = `fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const paths = {
    home: '<path d="M2 10 12 2l10 8v11H15v-7H9v7H2Z"/>',
    message: '<rect x="2" y="3" width="20" height="15" rx="4"/><path d="m7 22 4-4"/>',
    calendar: '<rect x="2" y="4" width="20" height="18" rx="4"/><path d="M7 2v5M17 2v5M2 10h20"/>',
    records: '<path d="M4 3h12l4 4v14H4Z"/><path d="M16 3v5h5M8 13h8M8 17h6"/>',
    phone: '<path d="M5 3h4l2 5-3 2c2 4 5 7 9 9l2-3 5 2v4c0 2-2 3-4 3C10 23 2 15 1 5c0-2 1-2 4-2Z"/>',
    heart: '<path d="M12 22S3 17 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 8-9 13-9 13Z"/>',
    shield: '<path d="M12 2 4 5v6c0 6 4 10 8 12 4-2 8-6 8-12V5Z"/><path d="m8 12 3 3 5-6"/>',
    more: '<circle cx="5" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="2" fill="currentColor" stroke="none"/>',
  };
  return `<g transform="translate(${x} ${y})" color="${color}" ${common}>${paths[kind]}</g>`;
};

const phoneX = [70, 530, 990, 1450, 1910];
const phoneY = 390;
const phoneWidth = 390;
const phoneHeight = 844;

const phone = (x, kicker, title, subtitle, accent) => [
  rect(x, phoneY, phoneWidth, phoneHeight, 44, '#17141A'),
  rect(x + 12, phoneY + 12, phoneWidth - 24, phoneHeight - 24, 34, palette.background),
  rect(x + 144, phoneY + 22, 102, 8, 4, '#D8D1C9'),
  text(x + 32, phoneY + 70, kicker.toUpperCase(), 12, 700, accent),
  text(x + 32, phoneY + 104, title, 29, 760),
  text(x + 32, phoneY + 132, subtitle, 14, 500, palette.muted),
].join('');

const nav = (x, active) => {
  const items = [['home', 'Home'], ['message', 'Messages'], ['calendar', 'Calendar'], ['records', 'Records'], ['more', 'More']];
  let body = rect(x + 20, phoneY + 748, phoneWidth - 40, 72, 24, palette.surface, palette.line, 1);
  items.forEach(([glyph, label], index) => {
    const baseX = x + 38 + index * 69;
    if (index === active) body += rect(baseX - 10, phoneY + 757, 56, 50, 18, palette.plumSoft);
    body += icon(glyph, baseX + 6, phoneY + 765, index === active ? palette.plum : '#796E80');
    body += text(baseX + 18, phoneY + 802, label, 8, 650, index === active ? palette.plum : '#796E80', 'middle');
  });
  return body;
};

const actionCard = (x, y, title, body, color, glyph) => [
  rect(x, y, 334, 88, 24, palette.surface, palette.line, 1),
  rect(x + 16, y + 16, 56, 56, 18, color),
  icon(glyph, x + 32, y + 31, palette.surface),
  text(x + 90, y + 35, title, 17, 700),
  text(x + 90, y + 60, body, 12, 500, palette.muted),
].join('');

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2380" height="1640" viewBox="0 0 2380 1640">`;
svg += rect(0, 0, 2380, 1640, 0, palette.canvas);
svg += text(70, 82, 'PeacePad Native V2', 42, 780);
svg += text(70, 120, 'Family-first product system · calm, playful, practical · one React Native source', 20, 500, palette.muted);

svg += rect(70, 154, 2240, 166, 30, palette.surface, palette.line, 1);
svg += text(100, 195, 'COLOUR RHYTHM', 13, 700, palette.plum);
[['Plum', palette.plum], ['Coral', palette.coral], ['Sun', palette.sun], ['Aqua', palette.aqua], ['Cream', palette.cream], ['Ink', palette.ink]].forEach(([name, color], index) => {
  const x = 100 + index * 190;
  svg += rect(x, 218, 54, 54, 18, color, color === palette.cream ? palette.line : 'none', 1);
  svg += text(x + 68, 250, name, 15, 650);
});
svg += rect(1280, 184, 280, 100, 24, palette.coral);
svg += text(1420, 225, 'Primary action', 17, 700, palette.surface, 'middle');
svg += text(1420, 252, 'Warm, clear, never alarming', 12, 500, palette.background, 'middle');
svg += rect(1580, 184, 280, 100, 24, palette.cream, palette.line, 1);
svg += text(1720, 225, 'Secondary action', 17, 700, palette.ink, 'middle');
svg += text(1720, 252, 'Soft, supportive, reversible', 12, 500, palette.muted, 'middle');
svg += rect(1880, 184, 390, 100, 24, palette.aquaSoft);
svg += icon('shield', 1910, 214, palette.aqua);
svg += text(1950, 228, 'Safety is visible', 17, 700, '#257A70');
svg += text(1950, 254, 'Private by default · evidence stays yours', 12, 500, '#257A70');

// Home
svg += phone(phoneX[0], 'Good morning', 'Ready for today?', 'Your day, without pressure', palette.coral);
svg += rect(phoneX[0] + 28, phoneY + 158, 334, 98, 28, palette.cream);
svg += text(phoneX[0] + 52, phoneY + 193, 'Solo mode is ready', 18, 720);
svg += text(phoneX[0] + 52, phoneY + 220, 'Plan and organise now. Connect later.', 13, 500, palette.muted);
svg += rect(phoneX[0] + 275, phoneY + 174, 64, 64, 22, palette.sun);
svg += icon('heart', phoneX[0] + 295, phoneY + 193);
svg += actionCard(phoneX[0] + 28, phoneY + 278, 'Plan time', 'Keep the weekend clear', palette.coral, 'calendar');
svg += actionCard(phoneX[0] + 28, phoneY + 386, 'Message calmly', 'Coach helps before you send', palette.aqua, 'message');
svg += actionCard(phoneX[0] + 28, phoneY + 494, 'Save a record', 'Private, dated and organised', palette.plum, 'records');
svg += rect(phoneX[0] + 28, phoneY + 618, 334, 96, 24, palette.aquaSoft);
svg += text(phoneX[0] + 52, phoneY + 650, 'Support near Durham', 16, 720, '#257A70');
svg += text(phoneX[0] + 52, phoneY + 675, 'Weather-aware ideas for your parenting time', 12, 500, '#257A70');
svg += text(phoneX[0] + 52, phoneY + 699, 'Explore local options  →', 12, 700, '#257A70');
svg += nav(phoneX[0], 0);

// Messages
svg += phone(phoneX[1], 'Communication', 'Messages', 'One clear conversation at a time', palette.aqua);
svg += rect(phoneX[1] + 28, phoneY + 158, 334, 76, 22, palette.aquaSoft);
svg += icon('shield', phoneX[1] + 48, phoneY + 180, '#257A70');
svg += text(phoneX[1] + 88, phoneY + 186, 'Calm Coach is on', 16, 720, '#257A70');
svg += text(phoneX[1] + 88, phoneY + 209, 'Tone check before anything is sent', 12, 500, '#257A70');
svg += text(phoneX[1] + 28, phoneY + 272, 'Recent', 14, 700, palette.plum);
[['Co-parent', 'Pickup is confirmed for Saturday', '2m', palette.surface], ['PeacePad Coach', 'A calmer version is ready to review', '18m', palette.cream]].forEach(([name, body, time, fill], index) => {
  const y = phoneY + 292 + index * 100;
  svg += rect(phoneX[1] + 28, y, 334, 82, 22, fill, palette.line, 1);
  svg += rect(phoneX[1] + 44, y + 15, 52, 52, 18, index ? palette.sun : palette.plumSoft);
  svg += icon(index ? 'heart' : 'message', phoneX[1] + 58, y + 29);
  svg += text(phoneX[1] + 112, y + 31, name, 16, 700);
  svg += text(phoneX[1] + 112, y + 55, body, 11, 500, palette.muted);
  svg += text(phoneX[1] + 340, y + 31, time, 10, 600, '#796E80', 'end');
});
svg += rect(phoneX[1] + 28, phoneY + 520, 334, 128, 28, palette.plum);
svg += text(phoneX[1] + 52, phoneY + 557, 'Need help wording it?', 20, 760, palette.surface);
svg += text(phoneX[1] + 52, phoneY + 586, 'Speak or type. Coach keeps your intent,', 12, 500, palette.plumSoft);
svg += text(phoneX[1] + 52, phoneY + 607, 'removes heat, and leaves you in control.', 12, 500, palette.plumSoft);
svg += rect(phoneX[1] + 52, phoneY + 620, 166, 42, 18, palette.coral);
svg += text(phoneX[1] + 135, phoneY + 646, 'Open Coach', 13, 700, palette.surface, 'middle');
svg += nav(phoneX[1], 1);

// Calendar
svg += phone(phoneX[2], 'Shared plans', 'Calendar', 'Visitation, school and family time', palette.coral);
svg += rect(phoneX[2] + 28, phoneY + 158, 334, 54, 20, palette.surface, palette.line, 1);
svg += text(phoneX[2] + 52, phoneY + 191, '‹', 24, 700, palette.plum);
svg += text(phoneX[2] + 195, phoneY + 190, 'August 2026', 17, 750, palette.ink, 'middle');
svg += text(phoneX[2] + 338, phoneY + 191, '›', 24, 700, palette.plum);
['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((day, index) => svg += text(phoneX[2] + 53 + index * 46, phoneY + 243, day, 11, 700, '#796E80', 'middle'));
for (let row = 0; row < 5; row += 1) {
  for (let column = 0; column < 7; column += 1) {
    const day = row * 7 + column - 4;
    if (day <= 0 || day >= 32) continue;
    const x = phoneX[2] + 35 + column * 46;
    const y = phoneY + 260 + row * 42;
    if (day === 30) svg += rect(x, y - 23, 36, 36, 14, palette.coral);
    if (day === 16 || day === 23) svg += rect(x, y - 23, 36, 36, 14, palette.cream);
    svg += text(x + 18, y, day, 12, day === 30 ? 750 : 600, day === 30 ? palette.surface : palette.ink, 'middle');
    if (day === 16 || day === 23) svg += `<circle cx="${x + 18}" cy="${y + 9}" r="3" fill="${palette.aqua}"/>`;
  }
}
svg += rect(phoneX[2] + 28, phoneY + 490, 334, 102, 24, palette.surface, palette.line, 1);
svg += rect(phoneX[2] + 44, phoneY + 508, 8, 66, 4, palette.coral);
svg += text(phoneX[2] + 70, phoneY + 525, 'Saturday parenting time', 17, 720);
svg += text(phoneX[2] + 70, phoneY + 550, '10:00 AM – 6:00 PM · Durham', 12, 500, palette.muted);
svg += text(phoneX[2] + 70, phoneY + 573, 'Weather: 24° · outdoor ideas ready', 12, 650, '#257A70');
svg += rect(phoneX[2] + 28, phoneY + 608, 334, 106, 24, palette.aquaSoft);
svg += text(phoneX[2] + 52, phoneY + 642, 'Ideas that fit this visit', 16, 720, '#257A70');
svg += text(phoneX[2] + 52, phoneY + 668, 'Free splash pad · library event · picnic trail', 12, 500, '#257A70');
svg += text(phoneX[2] + 52, phoneY + 696, 'See activity plan  →', 12, 700, '#257A70');
svg += nav(phoneX[2], 2);

// Records
svg += phone(phoneX[3], 'Private by default', 'Records', 'Organised facts, not arguments', palette.plum);
svg += rect(phoneX[3] + 28, phoneY + 158, 334, 96, 28, palette.plumSoft);
svg += icon('records', phoneX[3] + 50, phoneY + 184, palette.plum);
svg += text(phoneX[3] + 92, phoneY + 188, 'Case Binder', 18, 750);
svg += text(phoneX[3] + 92, phoneY + 213, 'Dated, source-linked, exportable', 12, 500, palette.muted);
svg += text(phoneX[3] + 92, phoneY + 234, 'Only you control access', 11, 650, palette.plum);
svg += rect(phoneX[3] + 28, phoneY + 274, 334, 56, 20, palette.coral);
svg += text(phoneX[3] + 195, phoneY + 309, '+ Add a record', 14, 720, palette.surface, 'middle');
svg += text(phoneX[3] + 28, phoneY + 372, 'Timeline', 14, 700, palette.plum);
[['Today', 'School schedule confirmed', 'Email attached', palette.sun], ['Aug 24', 'Pickup time updated', 'Screenshot + note', palette.aqua], ['Aug 16', 'Parenting time completed', 'Private reflection', palette.coral]].forEach(([date, title, meta, color], index) => {
  const y = phoneY + 392 + index * 86;
  svg += rect(phoneX[3] + 28, y, 334, 70, 20, palette.surface, palette.line, 1);
  svg += rect(phoneX[3] + 44, y + 17, 12, 36, 6, color);
  svg += text(phoneX[3] + 72, y + 27, date, 10, 700, '#796E80');
  svg += text(phoneX[3] + 72, y + 48, title, 14, 700);
  svg += text(phoneX[3] + 338, y + 47, meta, 10, 500, palette.muted, 'end');
});
svg += rect(phoneX[3] + 28, phoneY + 674, 334, 40, 16, palette.cream);
svg += text(phoneX[3] + 195, phoneY + 700, 'Export a clear, chronological summary', 11, 650, palette.plum, 'middle');
svg += nav(phoneX[3], 3);

// More
svg += phone(phoneX[4], 'Your PeacePad', 'More', 'Support for the whole journey', palette.sun);
[
  ['Calls', 'Audio + video with respectful controls', palette.aquaSoft, palette.aqua, 'phone'],
  ['Conch mode', 'One person speaks. Everyone gets heard.', palette.cream, palette.coral, 'message'],
  ['Support near me', 'Local services, weather and activities', palette.plumSoft, palette.plum, 'heart'],
  ['Parenting profile', 'Personality insights, not labels', '#FFF6D8', '#9A6C00', 'records'],
  ['Settings & privacy', 'Notifications, safety and account controls', palette.surface, palette.ink, 'shield'],
].forEach(([title, body, fill, color, glyph], index) => {
  const y = phoneY + 158 + index * 105;
  svg += rect(phoneX[4] + 28, y, 334, 88, 24, fill, palette.line, fill === palette.surface ? 1 : 0);
  svg += rect(phoneX[4] + 44, y + 16, 56, 56, 18, palette.surface);
  svg += icon(glyph, phoneX[4] + 60, y + 31, color);
  svg += text(phoneX[4] + 118, y + 35, title, 16, 740);
  svg += text(phoneX[4] + 118, y + 59, body, 11, 500, palette.muted);
  svg += text(phoneX[4] + 340, y + 51, '›', 24, 600, color, 'end');
});
svg += nav(phoneX[4], 4);

svg += text(70, 1315, 'Experience rules', 24, 760);
[
  ['1', 'Solo-first', 'No forced invite or “family name” gate.', 'Enter immediately and connect later.', palette.coral],
  ['2', 'Calm language', 'Supportive, non-judgmental, never legalistic.', 'Coach de-escalates without taking sides.', palette.aqua],
  ['3', 'Colour with purpose', 'Purple anchors trust; coral, sun and aqua add warmth.', 'No wall-to-wall purple dashboard feel.', palette.sun],
  ['4', 'Real native patterns', 'One shared React Native system with real icons.', 'Same source across Android and iOS.', palette.plum],
  ['5', 'Safety stays visible', 'Privacy, evidence ownership and permissions are explicit.', 'Safe defaults before clever features.', palette.ink],
].forEach(([number, title, body, detail, color], index) => {
  const x = 70 + index * 450;
  svg += rect(x, 1350, 420, 170, 28, palette.surface, palette.line, 1);
  svg += rect(x + 22, 1372, 44, 44, 14, color);
  svg += text(x + 44, 1401, number, 16, 760, color === palette.sun ? palette.ink : palette.surface, 'middle');
  svg += text(x + 82, 1402, title, 17, 740);
  svg += text(x + 22, 1443, body, 12, 500, palette.muted);
  svg += text(x + 22, 1471, detail, 11, 650, index === 1 ? '#257A70' : palette.plum);
});

svg += '</svg>';

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, svg, 'utf8');
console.log(output);
