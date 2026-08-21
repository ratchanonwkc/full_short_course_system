/**
 * Combines the two-part receipt input (Book No. + Receipt No.) into the
 * standard display format, e.g. bookNo="J248422", number="49" -> "J248422/49"
 */
export function formatReceiptCode(bookNo, number) {
    if (!bookNo && !number) return "-";
    if (!bookNo) return String(number);
    if (!number) return String(bookNo);
    return `${bookNo}/${number}`;
}
