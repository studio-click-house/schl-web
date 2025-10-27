import ZeroBounceSDK, {
    ValidateEmailResponse,
} from '@zerobounce/zero-bounce-sdk';

const zeroBounce = new ZeroBounceSDK();

const init = (api_key: string): void => {
    zeroBounce.init(api_key);
};

export { init, zeroBounce, type ValidateEmailResponse };
