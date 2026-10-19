import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
  TrackSource,
} from "livekit-server-sdk";
import type { VideoCall, CallCredentials } from "@just1date/types";

export interface CallProvider {
  credentials(call: VideoCall, actor: string): Promise<CallCredentials>;
  revoke(
    call: Pick<VideoCall, "room_name" | "caller_id" | "recipient_id">,
  ): Promise<void>;
  health(): Promise<void>;
  webhook(
    body: string,
    authorization?: string,
  ): Promise<{ event: string; room?: { name: string } }>;
}
export class LiveKitProvider implements CallProvider {
  private rooms: RoomServiceClient;
  private receiver: WebhookReceiver;
  constructor(
    private url: string,
    private key: string,
    private secret: string,
  ) {
    this.rooms = new RoomServiceClient(
      url.replace("wss:", "https:"),
      key,
      secret,
      { requestTimeout: 6 },
    );
    this.receiver = new WebhookReceiver(key, secret);
  }
  async credentials(call: VideoCall, actor: string) {
    await this.rooms.createRoom({
      name: call.room_name,
      maxParticipants: 2,
      emptyTimeout: 60,
      departureTimeout: 20,
    });
    const token = new AccessToken(this.key, this.secret, {
      identity: actor,
      ttl: 60,
    });
    token.addGrant({
      roomJoin: true,
      room: call.room_name,
      canPublish: true,
      canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
      canUpdateOwnMetadata: false,
    });
    return { token: await token.toJwt(), server_url: this.url, expires_in: 60 };
  }
  async revoke(
    call: Pick<VideoCall, "room_name" | "caller_id" | "recipient_id">,
  ) {
    const ignoreMissing = async (work: Promise<unknown>) => {
      try {
        await work;
      } catch (error) {
        if ((error as { code?: string }).code !== "not_found") throw error;
      }
    };
    // Cloud revocation with an explicit cutoff also invalidates very recent JWTs.
    const cutoff = BigInt(Math.ceil(Date.now() / 1000));
    await Promise.all(
      [call.caller_id, call.recipient_id].map((identity) =>
        ignoreMissing(
          this.rooms.removeParticipant(call.room_name, identity, {
            revokeTokenTs: cutoff,
          }),
        ),
      ),
    );
    await ignoreMissing(this.rooms.deleteRoom(call.room_name));
  }
  async health() {
    await this.rooms.listRooms(["j1d-healthcheck"]);
  }
  webhook(body: string, authorization?: string) {
    return this.receiver.receive(body, authorization);
  }
}
