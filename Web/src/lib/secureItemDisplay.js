export function getSecureItemDisplay(item) {
  const name = String(
    item?.itemName || item?.item_name || item?.itemname || ''
  ).trim();
  const notice = String(item?.public_notice || item?.publicNotice || '').trim();

  const hasDistinctNotice =
    !!notice && notice.toLowerCase() !== name.toLowerCase();

  return {
    name: name || 'Secure item',
    notice: hasDistinctNotice ? notice : '',
    showNotice: hasDistinctNotice,
  };
}
