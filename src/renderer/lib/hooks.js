import { useCallback, useEffect, useState } from "react";

export function useLoader(loader, dependencies = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const reload = useCallback(async () => {
    setState(previous => ({ ...previous, loading: true, error: "" }));
    try { setState({ loading: false, data: await loader(), error: "" }); }
    catch (error) { setState({ loading: false, data: null, error: error.message || "Something went wrong." }); }
  }, dependencies);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}
