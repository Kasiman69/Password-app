/** Works at an origin root, a GitHub project path, and a custom domain. */
export function appHomeUrl(): string {
  return new URL(".", document.baseURI).href;
}
