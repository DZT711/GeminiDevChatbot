import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export class HuggingFaceProvider extends OpenAICompatibleProvider {
  constructor(name: string, baseUrl: string) {
    super(name, baseUrl);
  }
}
