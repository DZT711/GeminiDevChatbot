import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(name: string, baseUrl: string) {
    super(name, baseUrl);
  }
}
