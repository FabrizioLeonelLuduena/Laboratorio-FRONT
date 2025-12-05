import { LabelSetting } from '../../domain/label-setting.model';
import { LabelSettingDTO } from '../dto/label-setting.dto';

/**
 * Mapper para transformar entre LabelSetting (domain) y LabelSettingDTO (infrastructure).
 */
export class LabelSettingMapper {
  /**
   * Converts DTO to domain model
   */
  static fromDTO(dto: LabelSettingDTO): LabelSetting {
    return {
      id: dto.id,
      labelTitle: dto.label_title
    };
  }

  /**
   * Converts domain model to DTO
   */
  static toDTO(model: LabelSetting): LabelSettingDTO {
    return {
      id: model.id,
      label_title: model.labelTitle
    };
  }
}
