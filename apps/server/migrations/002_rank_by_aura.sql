-- Recalcula patentes com base na aura total (escala ×100; aura sobe de 100 em 100).
UPDATE player_profiles
SET current_rank = CASE
  WHEN total_aura >= 190000 THEN 'AURA_LENDARIA'
  WHEN total_aura >= 175000 THEN 'EGO_INABALAVEL'
  WHEN total_aura >= 160000 THEN 'PRESENCA_DOMINANTE'
  WHEN total_aura >= 145000 THEN 'SIX_SEVEN_CERTIFICADO'
  WHEN total_aura >= 130000 THEN 'FARMER_DE_AURA'
  WHEN total_aura >= 115000 THEN 'AURA_QUESTIONAVEL'
  WHEN total_aura >= 95000 THEN 'EGO_FRAGIL'
  ELSE 'SEM_PRESENCA'
END;
