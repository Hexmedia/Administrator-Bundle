<?php

namespace Hexmedia\AdministratorBundle\EditMode;

use Doctrine\ORM\EntityManager;
use Symfony\Component\HttpFoundation\Request;

abstract class EntityUpdater {
    public abstract function findByPath($path);

    public abstract function getField($path);

    /**
     * @var \Doctrine\ORM\EntityManager
     */
    protected $entityManager;

    public function __construct(EntityManager $entityManager) {
        $this->entityManager = $entityManager;
    }

    public function update($content) {
        $dc = json_decode($content, true);

        foreach ($dc as $path => $content) {
            $entitiy = $this->findByPath($path);
            $field = $this->getField($path);

            $setter = "set" . ucfirst($field);

            $entitiy->$setter($content);
        }

        $this->entityManager->flush();
    }
}