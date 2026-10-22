/** The previous frontend used PNG aliases. New clients always use fresh WebPs. */
export function editorialDemoPhoto(path: string) {
  const legacy = /^\/images\/demo\/(amara|tomi|zara|daniel)\.png$/.exec(path);
  return legacy ? `/images/editorial/${legacy[1]}.webp` : path;
}
