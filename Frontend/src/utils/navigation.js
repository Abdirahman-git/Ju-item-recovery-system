export const safeGoBack = (router) => {
  if (typeof router?.canGoBack === 'function' && router.canGoBack()) {
    router.back();
  }
};
