import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export class TogetherProvider extends OpenAICompatibleProvider {
  constructor(name: string, baseUrl: string) {
    super(name, baseUrl);
  }
}
