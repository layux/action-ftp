import path from 'path';
import { LoggerFactory } from 'src/logger/application/logger.factory';
import { FileUploader } from '../domain/file-uploader.interface';
import { Transfer } from '../domain/transfer.interface';

export class UploadOrchestratorService {
  private readonly logger = LoggerFactory.getLogger(
    UploadOrchestratorService.name
  );
  constructor(private readonly fileUploader: FileUploader) {}

  async uploadFiles(transfers: Array<Transfer>) {
    this.logger.info(`Starting transfer using ${transfers}`);

    try {
      for (const transfer of transfers) {
        this.logger.info(`Starting transfer of '${transfer.localPath}' to '${transfer.remotePath}'`);

        // Get the files to upload
        const filesToUpload = await this.fileUploader.getFilesToUpload(
          transfer.localPath,
          transfer.ignore
        );

        // If there's no files to upload then we can skip this transfer
        if (!filesToUpload.length) {
          this.logger.warn(
            `Transfer detected no files to upload for ${transfer.localPath}`
          );
          continue;
        }

        this.logger.info(`Found ${filesToUpload.length} files to upload`);
        this.logger.info(JSON.stringify(filesToUpload));

        // If transfer is marked as forceClean then we need to delete the remote directory first
        if (transfer.forceClean) {
          this.logger.warn('Transfer is marked as forceClean, directory will be deleted');
          await this.fileUploader.deleteDirectory(transfer.remotePath);
        }

        // Ensure that the remote directory exists
        const remotePathExists = await this.fileUploader.pathExists(
          transfer.remotePath
        );

        if (!remotePathExists) {
          this.logger.warn(`Remote path '${transfer.remotePath}' does not exist, creating it`);
          await this.fileUploader.createDirectory(transfer.remotePath);
        }

        // Upload the files
        for (const fileToUpload of filesToUpload) {
          const uploaded = await this.fileUploader.uploadFile(
            fileToUpload,
            path.join(transfer.remotePath, path.basename(fileToUpload))
          );

          if (uploaded) {
            this.logger.info(
              `Successfully uploaded '${fileToUpload}'.`
            );
          } else {
            this.logger.error(
              `Failed to upload '${fileToUpload}'.`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error uploading files: ${error}`);
    }
  }
}
