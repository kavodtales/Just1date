// Code-rendered shapes: no screenshot pixels, baked text or controls.
export function PermissionArt({ friends = false }: { friends?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`permission-art code-art ${friends ? "friends-art" : "notification-art"}`}
    >
      {friends ? (
        <>
          <i className="person-back" />
          <i className="person-front" />
          <i className="person-body-back" />
          <i className="person-body-front" />
        </>
      ) : (
        <>
          <i className="bubble-back" />
          <i className="bubble-front">
            <b />
            <b />
          </i>
        </>
      )}
    </div>
  );
}
