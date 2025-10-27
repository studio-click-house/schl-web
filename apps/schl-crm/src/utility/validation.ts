const isValidMails = (mail: string): boolean => {
  const emailPattern =
    /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/;

  // Split the input string by ' / ' and trim any extra spaces
  const emails: string[] = mail.split(' / ').map((email) => email.trim());

  // Check if every email in the array matches the pattern
  return emails.every((email) => emailPattern.test(email));
};

const isValidHttpUrls = (string: string): boolean => {
  // Split the string by space (multiple links are separated by space in the input string)
  const urls = string.split(' ');

  for (const urlString of urls) {
    let url: URL;
    try {
      url = new URL(urlString);
    } catch (_) {
      return false;
    }
    if (!(url.protocol === 'http:' || url.protocol === 'https:')) {
      return false;
    }
  }
  return true;
};

export { isValidHttpUrls, isValidMails };
