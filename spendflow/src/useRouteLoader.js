import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function useRouteLoader(setLoading) {
  const location = useLocation();

  useEffect(() => {
    // show loader immediately on route change
    setLoading(true);

    // hide loader after short delay (UX smooth)
    const t = setTimeout(() => {
      setLoading(false);
    }, 300); // 300ms feels instant but visible

    return () => clearTimeout(t);
  }, [location.pathname, setLoading]);
}
