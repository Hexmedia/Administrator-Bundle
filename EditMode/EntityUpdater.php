<?php

namespace Hexmedia\AdministratorBundle\EditMode;

use Doctrine\ORM\EntityManager;
use Symfony\Component\HttpFoundation\Request;

abstract class EntityUpdater {
    public abstract function find($path);

    public abstract function getField($field);

    /**
     * @var \Doctrine\ORM\EntityManager
     */
    protected $entityManager;

    public function __construct(EntityManager $entityManager) {
        $this->entityManager = $entityManager;
    }

    public function update($id, $field, $content, $path) {

        $entitiy = $this->find($id);

        $field = $this->getField($field);

        $setter = "set" . ucfirst($field);

        $entitiy->$setter($content);

        $this->entityManager->flush();
    }
}